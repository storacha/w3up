import { tosUrl, Logo } from '../brand'

interface LayoutComponentProps {
  sidebar?: JSX.Element | JSX.Element[]
  children: JSX.Element | JSX.Element[]
}
type LayoutComponent = (props: LayoutComponentProps) => JSX.Element

export const DefaultLayout: LayoutComponent = ({ sidebar = <div></div>, children }) => {
  return (
    <div className='flex min-h-full w-full'>
      <nav className='flex-none w-64 bg-gray-900 text-white px-4 pb-4 border-r border-gray-800 h-screen'>
        <div className='flex flex-col justify-between h-full'>
          {sidebar}
          <div className='flex flex-col items-center'>
            <a href='/'><Logo className='w-36 mb-2' /></a>
            <div className='flex flex-row space-x-2'>
              <a className='text-xs block text-center mt-2' href='/terms'>Terms</a>
              <a className='text-xs block text-center mt-2' href='/docs'>Docs</a>
              <a className='text-xs block text-center mt-2' href='https://github.com/web3-storage/w3ui/issues'>Support</a>
            </div>
          </div>
        </div>
      </nav>
      <main className='grow bg-gray-dark text-white p-4 h-screen overflow-scroll'>
        {children}
      </main>
    </div>
  )
}