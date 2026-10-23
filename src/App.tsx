import {CurrencyConverter} from './components/CurrencyConverter'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import './App.css'

// Keep application layout here; CurrencyConverter owns the conversion workflow.
function App() {
    return (
        <main id="center">
            <div className="container">
                <header className="d-flex flex-wrap justify-content-center py-3 mb-4 border-bottom"><a href="/"
                                                                                                       className="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-body-emphasis text-decoration-none">
                    <span className="fs-4">Test Driven Solutions</span> </a>
                    <ul className="nav nav-pills">
                        <li className="nav-item"><a href="#" className="nav-link active" aria-current="page">Home</a>
                        </li>
                    </ul>
                </header>
            </div>
            <div className="container">
                <div className="card">
                    <div className="card-header">
                        Currency conversion tool
                    </div>
                    <div className="card-body">
                        <CurrencyConverter/>
                    </div>
                </div>
            </div>
        </main>
    )
}

export default App
