import { For, Show } from "solid-js"

function StatusLoader ({ progressStatus }) {
  const { total, loaded, lengthComputable } = progressStatus
  return (
    <Show
      when={lengthComputable}
      fallback={<div className='spinner mr3 flex-none' />}>
      <div className='relative w2 h5 ba b--white flex flex-column justify-end'>
        <div className='bg-white w100' style={{ height: `${Math.floor((loaded / total) * 100)}%` }}>
        </div>
      </div>
    </Show>
  )
}

export default function Loader ({ progress, className = '' }) {
  return (
    <div className={`${className} flex flex-row`}>
      <For each={Object.values(progress.uploadProgress)}>
        {(status) => <StatusLoader progressStatus={status} key={status.url} />}
      </For>
    </div>
  )
}