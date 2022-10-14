import { loadDefaultIdentity } from '@w3ui/wallet-core'
import { uploadCarChunks, encodeFile, encodeDirectory, chunkBlocks } from '@w3ui/uploader-core'

const SELECTORS = {
  uploadForm: '#upload-form',
  uploadFormTemplate: '#upload-form-template',
  encodingTemplate: '#file-encoding-template',
  uploadingTemplate: '#file-uploading-template',
  uploadCompleteTemplate: '#upload-complete-template',
  uploadErrorTemplate: '#upload-error-template',
  allowDirectorySelectionCheckbox: '#upload-form input[type=checkbox]',
  fileInput: 'input[type=file]'
}

export class UploadFileForm extends window.HTMLElement {
  constructor () {
    super()
    this.allowDirectorySelection = false
    this.files = []
    this.form$ = document.querySelector(SELECTORS.uploadForm)
    this.uploadFormTemplate$ = document.querySelector(SELECTORS.uploadFormTemplate)
    this.encodingTemplate$ = document.querySelector(SELECTORS.encodingTemplate)
    this.uploadingTemplate$ = document.querySelector(SELECTORS.uploadingTemplate)
    this.uploadCompleteTemplate$ = document.querySelector(SELECTORS.uploadCompleteTemplate)
    this.uploadErrorTemplate$ = document.querySelector(SELECTORS.uploadErrorTemplate)

    this.allowDirectorySelectionHandler = this.allowDirectorySelectionHandler.bind(this)
  }

  async allowDirectorySelectionHandler (event) {
    this.allowDirectorySelection = event.target.checked
    const fileInputEl$ = this.form$.querySelector(SELECTORS.fileInput)
    if (fileInputEl$ && event.target.checked) {
      fileInputEl$.setAttribute('type', 'file')
      fileInputEl$.setAttribute('webkitdirectory', 'true')
      fileInputEl$.removeAttribute('multiple')
    } else if (fileInputEl$) {
      fileInputEl$.removeAttribute('type')
      fileInputEl$.removeAttribute('webkitdirectory')
      fileInputEl$.toggleAttribute('multiple', true)
    }
  }

  async handleFileUpload (event) {
    event.preventDefault()
    const fileInputEl$ = this.form$.querySelector(SELECTORS.fileInput)
    this.files = fileInputEl$.files
    const identity = await loadDefaultIdentity()

    if (identity) {
      console.log(`DID2: ${identity.signingPrincipal.did()}`)
    } else {
      console.log('No identity registered2')
    }

    console.log(this.files)
    if (this.files.length < 1) {
      return
    }

    try {
      this.toggleEncoding()

      let encodeFunction
      if (this.files.length > 1 || this.allowDirectorySelection) {
        encodeFunction = encodeDirectory
      } else {
        encodeFunction = encodeFile
      }

      const { cid, blocks } = encodeFunction(this.files)

      cid.then(cid => {
        this.cid = cid
        this.toggleUploading()
      })

      const chunks = chunkBlocks(blocks)
      await uploadCarChunks(identity.signingPrincipal, chunks)
    } catch (error) {
      console.log(error)
      this.toggleUploadError()
    } finally {
      this.toggleUploadComplete()
    }
  }

  toggleEncoding () {
    const templateContent = this.encodingTemplate$.content
    this.replaceChildren(this.formatEncodingTemplateContent(templateContent))
  }

  toggleUploading () {
    const templateContent = this.uploadingTemplate$.content
    this.replaceChildren(this.formatUploadingTemplateContent(templateContent))
  }

  toggleUploadComplete () {
    const templateContent = this.uploadCompleteTemplate$.content
    this.replaceChildren(this.formatUploadCompleteTemplateContent(templateContent))
  }

  toggleUploadError () {
    const templateContent = this.uploadErrorTemplate$.content
    this.replaceChildren(this.formatUploadErrorTemplateContent(templateContent))
  }

  formatEncodingTemplateContent (templateContent) {
    const fileNameSlot = templateContent.querySelector('[data-file-slot]')
    fileNameSlot.innerText = this.files.length
    return templateContent
  }

  formatUploadingTemplateContent (templateContent) {
    const cidSlot = templateContent.querySelector('[data-root-cid-slot]')
    cidSlot.innerText = this.cid
    const fileNameSlot = templateContent.querySelector('[data-file-slot]')
    fileNameSlot.innerText = this.files.length
    return templateContent
  }

  formatUploadErrorTemplateContent (templateContent) {
    const slot = templateContent.querySelector('[data-error-messages-slot]')
    slot.innerText = this.errors
    return templateContent
  }

  formatUploadCompleteTemplateContent (templateContent) {
    const slot = templateContent.querySelector('[data-root-cid-slot]')
    slot.innerText = this.cid
    const hrefSlot = templateContent.querySelector('[data-root-cid-href-slot]')
    hrefSlot.href = `https://w3s.link/ipfs/${this.cid}`
    return templateContent
  }

  async connectedCallback () {
    const templateContent = this.uploadFormTemplate$.content
    this.replaceChildren(templateContent)
    this.handleFileUpload = this.handleFileUpload.bind(this)
    this.form$ = document.querySelector(SELECTORS.uploadForm)
    this.form$.addEventListener('submit', this.handleFileUpload)

    this.allowDirectorySelectionCheckbox$ = document.querySelector(SELECTORS.allowDirectorySelectionCheckbox)
    this.allowDirectorySelectionCheckbox$.addEventListener('click', this.allowDirectorySelectionHandler)
  }

  disconnectedCallback () {
    this.form$.removeEventListener('submit', this.handleFileUpload)
    this.allowDirectorySelectionCheckbox$.removeEventListener('click', this.allowDirectorySelectionHandler)
  }
}

window.customElements.define('upload-form', UploadFileForm)
