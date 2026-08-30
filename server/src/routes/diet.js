const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRole, resolveCoach } = require('../middleware/auth');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../lib/errors');

const router = express.Router();

router.use(authenticateToken, requireRole('COACH'), resolveCoach);

// ─── Ownership helper ─────────────────────────────────────────────────────────

async function getOwnedTemplate(templateId, coachId) {
  const template = await prisma.dietTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new NotFoundError('Diet template not found.');
  if (template.coachId !== coachId) throw new ForbiddenError('Not authorized.');
  return template;
}

// ─── Templates ────────────────────────────────────────────────────────────────

/** GET /diet/templates */
router.get('/templates', async (req, res, next) => {
  try {
    const templates = await prisma.dietTemplate.findMany({
      where: { coachId: req.coach.id },
      include: { meals: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

/** POST /diet/templates */
router.post('/templates', async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim()) return next(new BadRequestError('title is required.'));
    const template = await prisma.dietTemplate.create({
      data: { coachId: req.coach.id, title: title.trim(), description: description || null },
      include: { meals: true },
    });
    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
});

/** GET /diet/templates/:id */
router.get('/templates/:id', async (req, res, next) => {
  try {
    await getOwnedTemplate(req.params.id, req.coach.id);
    const template = await prisma.dietTemplate.findUnique({
      where: { id: req.params.id },
      include: { meals: { orderBy: { order: 'asc' } } },
    });
    res.json(template);
  } catch (err) {
    next(err);
  }
});

/** PUT /diet/templates/:id */
router.put('/templates/:id', async (req, res, next) => {
  try {
    await getOwnedTemplate(req.params.id, req.coach.id);
    const { title, description } = req.body;
    const updated = await prisma.dietTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
      },
      include: { meals: { orderBy: { order: 'asc' } } },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** DELETE /diet/templates/:id */
router.delete('/templates/:id', async (req, res, next) => {
  try {
    await getOwnedTemplate(req.params.id, req.coach.id);
    await prisma.dietTemplate.delete({ where: { id: req.params.id } });
    res.json({ message: 'Diet template deleted.' });
  } catch (err) {
    next(err);
  }
});

// ─── Meals ────────────────────────────────────────────────────────────────────

/** POST /diet/templates/:id/meals */
router.post('/templates/:id/meals', async (req, res, next) => {
  try {
    await getOwnedTemplate(req.params.id, req.coach.id);
    const { name, notes, order } = req.body;
    if (!name || !name.trim()) return next(new BadRequestError('name is required.'));

    // Auto-order: append at end if not provided
    let mealOrder = order;
    if (mealOrder === undefined) {
      const count = await prisma.dietTemplateMeal.count({ where: { dietTemplateId: req.params.id } });
      mealOrder = count;
    }

    const meal = await prisma.dietTemplateMeal.create({
      data: {
        dietTemplateId: req.params.id,
        name: name.trim(),
        notes: notes || null,
        order: mealOrder,
      },
    });
    res.status(201).json(meal);
  } catch (err) {
    next(err);
  }
});

/** PUT /diet/meals/:mealId */
router.put('/meals/:mealId', async (req, res, next) => {
  try {
    const meal = await prisma.dietTemplateMeal.findUnique({
      where: { id: req.params.mealId },
      include: { dietTemplate: true },
    });
    if (!meal) return next(new NotFoundError('Meal not found.'));
    if (meal.dietTemplate.coachId !== req.coach.id) return next(new ForbiddenError('Not authorized.'));

    const { name, notes, order } = req.body;
    const updated = await prisma.dietTemplateMeal.update({
      where: { id: req.params.mealId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(notes !== undefined && { notes }),
        ...(order !== undefined && { order }),
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** DELETE /diet/meals/:mealId */
router.delete('/meals/:mealId', async (req, res, next) => {
  try {
    const meal = await prisma.dietTemplateMeal.findUnique({
      where: { id: req.params.mealId },
      include: { dietTemplate: true },
    });
    if (!meal) return next(new NotFoundError('Meal not found.'));
    if (meal.dietTemplate.coachId !== req.coach.id) return next(new ForbiddenError('Not authorized.'));

    await prisma.dietTemplateMeal.delete({ where: { id: req.params.mealId } });
    res.json({ message: 'Meal deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
