<script>
import { AuthProvider } from '@w3ui/vue-wallet'
import { UploadsListProvider } from '@w3ui/vue-uploads-list'
import Authenticator from './components/Authenticator.vue'
import ContentPage from './ContentPage.vue'

export default {
  components: { AuthProvider, UploadsListProvider, Authenticator, ContentPage }
}
</script>

<template>
  <AuthProvider>
    <UploadsListProvider>
      <div className="vh-100 flex flex-column justify-center items-center sans-serif light-silver">
        <header>
          <img src="./assets/logo.png" width="250" alt="logo" />
        </header>
        <Authenticator>
          <ContentPage />
        </Authenticator>
      </div>
    </UploadsListProvider>
  </AuthProvider>
</template>
