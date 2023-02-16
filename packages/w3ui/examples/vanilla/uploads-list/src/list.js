import { listUploads } from '@w3ui/uploads-list-core'
import { loadDefaultIdentity } from '@w3ui/keyring-core'

const SELECTORS = {
  listTemplate: '#list',
  listItemTemplate: '#list-item',
  noUploadTemplate: '#no-uploads',
  reloadButton: '[data-reload-button]',
  error: '.list-error',
  table: 'table',
}

export class ListFiles extends window.HTMLElement {
  constructor() {
    super()
    this.listTemplate$ = document.querySelector(SELECTORS.listTemplate)
    this.listItemTemplate$ = document.querySelector(SELECTORS.listItemTemplate)
    this.listErrorTemplate$ = document.querySelector(
      SELECTORS.listErrorTemplate
    )
    this.updateList = this.updateList.bind(this)
    this.noUploads = false
  }

  async connectedCallback() {
    this.appendChild(this.listTemplate$?.content.cloneNode(true))
    this.table = this.querySelector(SELECTORS.table)
    this.error = this.querySelector(SELECTORS.error)

    this.tbody = this.querySelector('tbody')

    this.identity = await loadDefaultIdentity()
    if (!this.identity) {
      throw Error('Trying to upload but identity is missing')
    }
    this.updateList()
  }

  async updateList() {
    try {
      const files = (await listUploads(this.identity.signingPrincipal)).results
      if (files.length > 0) {
        const fileElements = files.map((file) => this.renderFileRow(file))
        this.tbody.append(...fileElements)
        this.toggleError(false)
      } else if (this.noUploads === false) {
        this.noUploads = true
        this.toggleNoUploads()
      }
    } catch (err) {
      this.toggleError(true)
      throw new Error('failed to list uploads', { cause: err })
    }
  }

  toggleError(showError) {
    this.table.hidden = showError
    this.error.hidden = !showError
  }

  toggleNoUploads() {
    const templateContent = document.querySelector(SELECTORS.noUploadTemplate)
    this.replaceChildren(templateContent.content)
    const reloadButton = document.querySelector(SELECTORS.reloadButton)
    reloadButton.addEventListener('click', this.updateList)
  }

  renderFileRow(file) {
    const item = this.listItemTemplate$?.content.cloneNode(true)
    const columns = item.querySelectorAll('td')
    const gatewayLinkEl = document.createElement('a')
    gatewayLinkEl.href = `https://w3s.link/ipfs/${file.dataCid}`
    gatewayLinkEl.textContent = file.dataCid
    gatewayLinkEl.classList.add(...['white', 'link'])
    columns[0].appendChild(gatewayLinkEl)
    columns[1].textContent = file.carCids[0]
    columns[2].textContent = new Date(file.uploadedAt).toLocaleString()
    return item
  }
}

window.customElements.define('list-files', ListFiles)
