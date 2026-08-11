# Workspace Guidelines

1. **Use Reusable Shared Components**:
   Always check and use pre-existing UI components located in `client/src/components/` (such as `<Button />`, `<ClientCard />`, `<Table />`, `<ExerciseCard />`, `<Profile />`, `<InfoDiv />`, `<SearchBar />`, `<Autocomplete />`) before rendering raw HTML elements.

2. **Use Design Tokens**:
   Always use CSS custom properties from `client/src/styles/tokens.css` (e.g. `var(--accent)`, `var(--bg)`, `var(--surface)`, `var(--text-primary)`, `var(--radius-full)`) instead of hardcoding hex colors or pixel values.
