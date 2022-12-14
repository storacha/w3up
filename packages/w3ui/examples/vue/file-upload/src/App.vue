<script>
import { KeyringProvider } from '@w3ui/vue-keyring'
import { UploaderProvider } from '@w3ui/vue-uploader'
import Authenticator from './components/Authenticator.vue'
import ContentPage from './ContentPage.vue'

export default {
  components: { KeyringProvider, UploaderProvider, Authenticator, ContentPage }
}
</script>

<template>
  <KeyringProvider>
    <UploaderProvider>
      <div className="vh-100 flex flex-column justify-center items-center sans-serif light-silver">
        <header>
          <img src="./assets/logo.png" width="250" alt="logo" />
        </header>
        <div className="w-90 w-50-ns mw6">
          <Authenticator>
            <ContentPage />
          </Authenticator>
        </div>
      </div>
    </UploaderProvider>
  </KeyringProvider>
</template>
