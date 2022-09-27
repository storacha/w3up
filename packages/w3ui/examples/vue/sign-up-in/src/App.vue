<script>
import { AuthProvider } from '@w3ui/vue-wallet'
import ContentPage from './ContentPage.vue'

export default {
  components: { AuthProvider, ContentPage }
}
</script>

<template>
  <AuthProvider>
    <div className="vh-100 flex flex-column justify-center items-center sans-serif light-silver">
      <header>
        <img src="./assets/logo.png" width="250" alt="logo" />
      </header>
      <div className="w-90 w-50-ns mw6">
        <ContentPage />
      </div>
    </div>
  </AuthProvider>
</template>
