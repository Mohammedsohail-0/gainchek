import Navbar from '../components/Navbar'
import Logo from '../components/Logo'
import Button from '../components/Button'
import './LandingPage.css';

function LandingPage() {
  return (
    <div>
      <Nav></Nav>
      <Hero></Hero>
    </div>
  )
}

export default LandingPage


function Nav() {
  return (
    <div className='nav-wrapper'>
      <div className='logo-container'><Logo></Logo></div>
      <div className='navigations-container'>
        <p>FEATURES</p>
        <p>SIGN IN</p>
        <Button variant={"primary"} text={"Get Started for free"}></Button>
      </div>
    </div>
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
          <Button variant={"secondary"} text={"See how it works"} className='cta-1'></Button>
          <Button variant={"primary"} text={"Get Started"} className='cta-2'></Button>
        </div>

      </div>
      <div className='image-wrapper'>
        <img src="/landing_splash.png" alt="Landing Splash" className="landing-splash-img" />
        <img src="/hero_dashboard.png" alt="Hero Dashboard" className='hero-dashboard-img'></img>
      </div>
    </div>
  )
}