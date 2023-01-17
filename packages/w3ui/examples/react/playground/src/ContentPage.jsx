import React from 'react'
import { UploadsList, Uploader, W3Upload } from '@w3ui/react'
import '@w3ui/react/src/styles/uploader.css'
import { Uploader as UploaderCore, UploaderProvider, useUploader } from '@w3ui/react-uploader'
import { UploadsListProvider } from '@w3ui/react-uploads-list'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

function NoUIUploadComponent () {
  const [{ storedDAGShards }, uploader] = useUploader()

  return (
    <div>
      <input type='file' onChange={e => uploader.uploadFile(e.target.files[0])} />
      {storedDAGShards?.map(({ cid, size }) => (
        <p key={cid.toString()}>
          {cid.toString()} ({size} bytes)
        </p>
      ))}
    </div>
  )
}

function NoUIComponent () {
  return (
    <UploaderProvider>
      <NoUIUploadComponent />
    </UploaderProvider>
  )
}

function HeadlessUIComponent () {
  return (
    <UploaderProvider>
      <UploaderCore>
        <UploaderCore.Form>
          <div>
            <label htmlFor='file'>File:</label>
            <UploaderCore.Input id='file' />
          </div>
          <button type='submit'>Upload</button>
        </UploaderCore.Form>
      </UploaderCore>
    </UploaderProvider>
  )
}

function CustomizableUIComponent () {
  return (
    <div>
      <UploaderProvider>
        <Uploader />
      </UploaderProvider>
      <UploadsListProvider>
        <UploadsList />
      </UploadsListProvider>
    </div>
  )
}

function DropinUIComponent () {
  return (
    <W3Upload />
  )
}

export function ContentPage () {
  return (
    <>
      <p style={{ color: 'lightgray', padding: '24px 0', fontSize: '1.2rem', fontWeight: '300' }}>
        W3UI provides React components at four different levels of
        abstraction, each of which builds upon the last.
      </p>

      <section>
        <h2>1. Drop-in UI</h2>
        <p>
          Components designed to be dropped into a page with very little customization.
          Limited styling customization may be supported:
        </p>
        <SyntaxHighlighter language='jsx' style={a11yDark}>
          {`import { W3Upload } from '@w3ui/react'

function ${DropinUIComponent.name} () {
  return (
    <W3Upload />
  )
}`}
        </SyntaxHighlighter>
        <DropinUIComponent />
      </section>

      <section>
        <h2>2. Customizable UI</h2>
        <p>
          Components that work out of the box, and let you customize some aspects of
          markup and most of the styling:
        </p>
        <SyntaxHighlighter language='jsx' style={a11yDark}>
          {`import { W3Upload, UploaderProvider } from '@w3ui/react'

function ${CustomizableUIComponent.name}() {
  return (
    <UploaderProvider>
      <Uploader />
    </UploaderProvider>
  )
}
`}
        </SyntaxHighlighter>
        <CustomizableUIComponent />
      </section>

      <section>
        <h2>3. Headless UI</h2>
        <p>
          A set of components designed to work together, modeled after HeadlessUI
          components like <a href='https://headlessui.com/react/combobox'>Combobox</a>.
          These components don't make any markup or styling choices for you:
        </p>
        <SyntaxHighlighter language='jsx' style={a11yDark}>
          {`import { Uploader } from '@w3ui/react-uploader'

function ${HeadlessUIComponent.name}() {
  return (
    <Uploader>
      <Uploader.Form>
        <div>
          <label htmlFor='file'>File:</label>
          <Uploader.Input id="file" />
        </div>
        <button type='submit'>Upload</button>
      </Uploader.Form>
    </Uploader>
  )
}`}
        </SyntaxHighlighter>
        <HeadlessUIComponent />
      </section>

      <h2>4. No UI</h2>
      <p>
        Maximum flexibility, React Contexts and hooks only:
      </p>
      <SyntaxHighlighter language='jsx' style={a11yDark}>
        {`import { useUploader, UploaderProvider } from '@w3ui/react-uploader'

function ${NoUIUploadComponent.name}() {
  const [{ storedDAGShards }, uploader] = useUploader()

  return (
    <div>
      <input type="file" onChange={e => uploader.uploadFile(e.target.files[0])} />
      {storedDAGShards?.map(({ cid, size }) => (
        <p key={cid.toString()}>
          {cid.toString()} ({size} bytes)
        </p>
      ))}
    </div>
  )
}

function ${NoUIComponent.name}() {
  return (
    <UploaderProvider>
      <NoUIUploadComponent />
    </UploaderProvider>
  )
}
`}
      </SyntaxHighlighter>
      <NoUIComponent />

    </>
  )
}

export default ContentPage
