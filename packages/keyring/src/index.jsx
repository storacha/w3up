import { render } from 'preact'
import './index.css'
const App = () => (
  <>
    <p className="app-title">Built by ESBuild!</p>
  </>
)

// eslint-disable-next-line unicorn/prefer-query-selector
const appEl = document.getElementById('app')

if (appEl) {
  render(<App />, appEl)
}
