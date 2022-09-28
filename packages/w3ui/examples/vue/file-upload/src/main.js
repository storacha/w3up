import { createApp } from 'vue'
import App from './App.vue'

import './assets/tachyons.min.css'

const app = createApp(App)
app.config.unwrapInjectedRef = true

app.mount('#app')
