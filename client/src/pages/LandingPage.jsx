import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import Button from '../components/Button'
import './LandingPage.css';
import { useIsMobile } from '../hooks/useIsMobile';

// Capture the install prompt as early as possible
let _deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredPrompt = e;
});

function LandingPage() {
  return (
    <div style={{ overflowX: 'hidden', width: '100%' }}>
      <Nav></Nav>
      <Hero></Hero>
      <ProblemsSection></ProblemsSection>
      <Features></Features>
      <CTA></CTA>

    </div>
  )
}

export default LandingPage


function Nav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <nav className='nav-wrapper'>
      <div className='logo-container'>
        <Logo />
      </div>

      <div className='navigations-container'>
        <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          <a href="#features" className="nav-link-item" onClick={closeMenu}>FEATURES</a>
          <a
            href="/login"
            className="nav-link-item"
            onClick={(e) => {
              e.preventDefault()
              closeMenu()
              navigate('/login')
            }}
          >
            SIGN IN
          </a>
        </div>

        <Button
          variant={"primary"}
          text={"Get Started"}
          onClick={() => document.querySelector('#cta')?.scrollIntoView({ behavior: 'smooth' })}
          className="nav-get-started-btn"
        />

        <button
          className="hamburger-btn"
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
              <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
              <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z" />
            </svg>
          )}
        </button>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <div className='hero'>
      <div className='cta-text-wrapper'>

        <div className='text-container'>
          <h1>Run <span>Personal Training</span> Business<br></br>
            Without Spreadsheet Chaos.</h1>
          <p>
            Replace your spreadsheets and scattered messages<br></br> with one simple tool — built for Personal Trainers & <br></br>Online Coaches
          </p>
        </div>

        <div className='hero-cta'>
          <Button variant={"secondary"} text={"See how it works"} className='cta-1' onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}></Button>
          <Button variant={"primary"} text={"Get Started"} className='cta-2' onClick={() => document.querySelector('#cta')?.scrollIntoView({ behavior: 'smooth' })}></Button>
        </div>

      </div>
      <div className='image-wrapper'>
        <img src="/landing_splash.png" alt="Landing Splash" className="landing-splash-img" />
        <img src="/hero_dashboard.png" alt="Hero Dashboard" className='hero-dashboard-img'></img>
      </div>
    </div>
  )
}

function ProblemsSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const problems = [
    {
      id: 1,
      image: '/problem-pic-1.png',
      quote: '"Bhai, today what workout?"',
      highlight: ' texts flooding your WhatsApp every morning?'
    },
    {
      id: 2,
      image: '/problem-pic-2.png',
      highlight: ' Spending hours manually typing out workout plans every single night?'
    },
    {
      id: 3,
      image: '/problem-pic-3.png',
      highlight: 'Tired of being a human diary for your clients reps and sets?'
    }
  ]

  useEffect(() => {
    if (isPaused) return
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % problems.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [isPaused, problems.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % problems.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + problems.length) % problems.length)
  }

  return (
    <div className='problems-section'>
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <filter id="noiseFilter" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix
            type="saturate"
            values="0"
            in="noise"
            result="monoNoise"
          />
          <feComponentTransfer in="monoNoise" result="alphaNoise">
            <feFuncA type="linear" slope="0.6" />
          </feComponentTransfer>
          <feBlend mode="color-burn" in="alphaNoise" in2="SourceGraphic" />
        </filter>
      </svg>

      <div className='problem-text-container'>
        <h1>WE UNDERSTAND THE PAIN AND<br />
          FRUSTRATION OF <span>LOSING CLIENTS.</span></h1>
      </div>

      <div
        className='slide-show-container'
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <button className='slideshow-arrow prev-arrow' onClick={prevSlide} aria-label="Previous slide">
          &#10094;
        </button>

        <div className='slides-wrapper'>

          <div className={`problem-card ${currentSlide === 0 ? 'active' : ''}`}>
            <div className='img-wrapper'>
              <div className='bg-card'></div>
              <img src='/problem-pic-1.png' alt="Problem illustration" className='problem-img problem-img-1' />
            </div>
            <div className='problem-statement problem-statement-1'>
              <p>"Bhai, today what workout?" <span> texts flooding your WhatsApp every morning?</span></p>
            </div>
          </div>

          <div className={`problem-card ${currentSlide === 1 ? 'active' : ''}`}>
            <div className='img-wrapper'>
              <div className='bg-card'></div>
              <img src='/problem-pic-2.png' alt="Problem illustration" className='problem-img problem-img-2' />
            </div>
            <div className='problem-statement problem-statement-2'>
              <p> <span>Spending hours manually</span> typing <span> out workout plans every single night?</span></p>
            </div>
          </div>

          <div className={`problem-card ${currentSlide === 2 ? 'active' : ''}`}>
            <div className='img-wrapper'>
              <div className='bg-card'></div>
              <img src='/problem-pic-3.png' alt="Problem illustration" className='problem-img problem-img-3' />
            </div>
            <div className='problem-statement problem-statement-3'>
              <p><span>Tired of being a human diary for your clients</span> reps <span>and</span> sets?</p>
            </div>
          </div>
        </div>

        <button className='slideshow-arrow next-arrow' onClick={nextSlide} aria-label="Next slide">
          &#10095;
        </button>
      </div>

      <div className='slideshow-dots'>
        {problems.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
      <div className='problem-section-footer'>
        <h2>Doing it manually costs you time and clients</h2>
      </div>
    </div>
  )
}


function Features() {
  return (
    <section id='features' className='features-section'>
      <div className='features-header'>
        <hr></hr>
        <div className='features-header-title'>
          <svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="currentColor"><path d="M423.5-103.5Q400-127 400-160h160q0 33-23.5 56.5T480-80q-33 0-56.5-23.5ZM320-200v-80h320v80H320Zm10-120q-69-41-109.5-110T180-580q0-125 87.5-212.5T480-880q125 0 212.5 87.5T780-580q0 81-40.5 150T630-320H330Z" /></svg>
          <h1>How it works</h1>
        </div>
        <hr></hr>
      </div>
      <div className='features-card'>
        <img src="/f-1.png" alt='features' className='f-1-image'></img>
        <div className='features-text-container'>
          <div>
            <p className='f-point'>1. <span>Build your template</span> </p>
          </div>
          <div>
            <p className='f-point-about'>Make your workout plan one time. Save it to use again and again.</p>
          </div>
        </div>
      </div>

      <div className='features-card f-card-2'>
        <div className='features-text-container'>
          <div>
            <p className='f-point'>2. <span>Assign to client</span> </p>
          </div>
          <div>
            <p className='f-point-about'>Pick a client. Send them the plan in one tap. No copy-paste.</p>
          </div>
        </div>
        <img src="/f-2.png" alt='features' className='f-2-image'></img>
      </div>

      <div className='features-card'>
        <img src="/f-3.png" alt='features' className='f-2-image'></img>
        <div className='features-text-container'>
          <div>
            <p className='f-point'>3. <span>Client logs progress</span> </p>
          </div>
          <div>
            <p className='f-point-about'>Your client tracks their own reps and weights in the app.<br></br> You just coach — no more writing everything down.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function CTA() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const handleGetStarted = async () => {
    if (isMobile && _deferredPrompt) {
      // Trigger the native PWA install dialog
      _deferredPrompt.prompt();
      const { outcome } = await _deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        _deferredPrompt = null;
      }
    } else {
      navigate('/register')
    }
  }

  return (
    <section id='cta' className='cta-section'>
      <div className='cta-card'>
        <div className='cta-badge'>
          Only 25 Spots — Early Access
        </div>
        <p className='cta-headline'>We're starting with<span> 25 trainers</span> to get this right.<br></br>Once they're in, you'll join the waitlist.</p>
        <Button
          variant={"primary"}
          className='final-cta-btn'
          text={isMobile ? "Install App" : "Get Started for free"}
          onClick={handleGetStarted}
        ></Button>
      </div>
    </section>
  )
}


