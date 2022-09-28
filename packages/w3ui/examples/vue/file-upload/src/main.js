import { createApp } from 'vue'
import App from './App.vue'

import './assets/tachyons.min.css'
import './assets/spinner.css'

const app = createApp(App)
app.config.unwrapInjectedRef = true

app.mount('#app')
