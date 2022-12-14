<script>
import { KeyringProvider } from '@w3ui/vue-keyring'
import { UploadsListProvider } from '@w3ui/vue-uploads-list'
import Authenticator from './components/Authenticator.vue'
import ContentPage from './ContentPage.vue'

export default {
  components: { KeyringProvider, UploadsListProvider, Authenticator, ContentPage }
}
</script>

<template>
  <KeyringProvider>
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
  </KeyringProvider>
</template>
