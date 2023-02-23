import type {
  As,
  Component,
  Props,
  Options,
  RenderProp
} from 'ariakit-react-utils'
import type {
  UploadsListContextState,
  UploadsListContextActions
} from '@w3ui/uploads-list-core'

import React, {
  Fragment,
  createContext,
  useContext,
  useMemo,
  useCallback
} from 'react'
import { createComponent, createElement } from 'ariakit-react-utils'
import { useUploadsList } from './providers/UploadsList'

export type UploadsListComponentContextState = UploadsListContextState

export type UploadsListComponentContextActions = UploadsListContextActions

export type UploadsListComponentContextValue = [
  state: UploadsListComponentContextState,
  actions: UploadsListComponentContextActions
]

export const UploadsListComponentContext = createContext<UploadsListComponentContextValue>([
  {
    /**
     * A boolean indicating whether the uploads list
     * is currently loading data from the server.
     */
    loading: false
  },
  {
    /**
     * A function that will load the previous page of results.
     */
    prev: async () => {},
    /**
     * A function that will load the next page of results.
     */
    next: async () => {},
    /**
     * A function that will reload the uploads list.
     */
    reload: async () => {}
  }
])

export type UploadsListRootOptions = Options<typeof Fragment>
export type UploadsListRenderProps = Omit<
Props<UploadsListRootOptions>,
'children'
> & {
  uploadsList?: UploadsListComponentContextValue
}
export type UploadsListRootProps = Omit<
Props<UploadsListRootOptions>,
'children'
> & {
  uploadsList?: UploadsListComponentContextValue
  children?: React.ReactNode | RenderProp<UploadsListRenderProps>
}

/**
 * Top level component of the headless UploadsList.
 *
 * Designed to be used with UploadsList.NextButton,
 * Uploader.ReloadButton, et al to easily create a
 * custom component for listing uploads to a web3.storage space.
 *
 * Always renders as a Fragment and does not support the `as` property.
 */
export const UploadsListRoot = (props: UploadsListRootProps): JSX.Element => {
  const [state, actions] = useUploadsList()
  const contextValue = useMemo<UploadsListComponentContextValue>(
    () => [state, actions],
    [state, actions]
  )
  const { children, ...childlessProps } = props
  const renderedChildren: React.ReactNode = Boolean(children) && typeof children === 'function'
    ? children({
      ...childlessProps,
      uploadsList: contextValue
    })
    : children as React.ReactNode
  return (
    <UploadsListComponentContext.Provider value={contextValue}>
      {renderedChildren}
    </UploadsListComponentContext.Provider>
  )
}

export type PrevButtonOptions<T extends As = 'button'> = Options<T>
export type PrevButtonProps<T extends As = 'button'> = Props<PrevButtonOptions<T>>

/**
 * Button that loads the next page of results.
 *
 * A 'button' designed to work with `UploadsList`. Any passed props will
 * be passed along to the `button` component.
 */
export const PrevButton: Component<PrevButtonProps> = createComponent((props: any) => {
  const [, { prev }] = useContext(UploadsListComponentContext)
  const onClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    void prev()
  }, [prev])
  return createElement('button', { ...props, onClick })
})

export type NextButtonOptions<T extends As = 'button'> = Options<T>
export type NextButtonProps<T extends As = 'button'> = Props<NextButtonOptions<T>>

/**
 * Button that loads the next page of results.
 *
 * A 'button' designed to work with `UploadsList`. Any passed props will
 * be passed along to the `button` component.
 */
export const NextButton: Component<NextButtonProps> = createComponent(
  (props: any) => {
    const [, { next }] = useContext(UploadsListComponentContext)
    const onClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault()
        void next()
      },
      [next]
    )
    return createElement('button', { ...props, onClick })
  }
)

export type ReloadButtonOptions<T extends As = 'button'> = Options<T>
export type ReloadButtonProps<T extends As = 'button'> = Props<ReloadButtonOptions<T>>

/**
 * Button that reloads an `UploadsList`.
 *
 * A 'button' designed to work with `UploadsList`. Any passed props will
 * be passed along to the `button` component.
 */
export const ReloadButton: Component<ReloadButtonProps> = createComponent(
  (props: any) => {
    const [, { reload }] = useContext(UploadsListComponentContext)
    const onClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault()
        void reload()
      },
      [reload]
    )
    return createElement('button', { ...props, onClick })
  }
)

/**
 * Use the scoped uploads list context state from a parent `UploadsList`.
 */
export function useUploadsListComponent (): UploadsListComponentContextValue {
  return useContext(UploadsListComponentContext)
}

export const UploadsList = Object.assign(UploadsListRoot, { PrevButton, NextButton, ReloadButton })
