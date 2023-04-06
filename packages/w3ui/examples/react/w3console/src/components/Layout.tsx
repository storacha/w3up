import { Logo } from '../brand'
import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

const navLinks = [
  { name: 'Terms', href: '/terms' },
  { name: 'Docs', href: '/docs' },
  { name: 'Support', href: 'https://github.com/web3-storage/w3ui/issues' },
]

interface SidebarComponentProps {
  sidebar?: JSX.Element | JSX.Element[]
}

function Sidebar ({ sidebar = <div></div> }: SidebarComponentProps): JSX.Element {
  return (
    <nav className='flex-none w-64 bg-gray-900 text-white px-4 pb-4 border-r border-gray-800 h-screen'>
      <div className='flex flex-col justify-between h-full'>
        {sidebar}
        <div className='flex flex-col items-center'>
          <a href='/'><Logo className='w-36 mb-2' /></a>
          <div className='flex flex-row space-x-2'>
            {navLinks.map(link => (
              <a className='text-xs block text-center mt-2' href={link.href}>{link.name}</a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}

interface LayoutComponentProps extends SidebarComponentProps {
  children: JSX.Element | JSX.Element[]
}

export function DefaultLayout ({ sidebar = <div></div>, children }: LayoutComponentProps): JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className='flex min-h-full w-full text-white'>
      {/* dialog sidebar for narrow browsers */}
      <Transition.Root show={sidebarOpen} >
        <Dialog onClose={() => setSidebarOpen(false)} as='div' className='relative z-50'>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-400"
            leaveFrom="opacity-100"
            leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
          </Transition.Child>
          <div className="fixed inset-0 flex justify-left">
            <Transition.Child
              as={Fragment}
              enter="transition duration-200"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition duration-400"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full">
              <Dialog.Panel>
                <XMarkIcon className='text-white w-6 h-6 fixed top-2 -right-8' onClick={() => setSidebarOpen(false)} />
                <Sidebar sidebar={sidebar} />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* static sidebar for wide browsers */}
      <div className='hidden lg:block'>
        <Sidebar sidebar={sidebar} />
      </div>
      <div className='w-full h-screen overflow-scroll'>
        {/* top nav bar for narrow browsers, mainly to have a place to put the hamburger */}
        <div className='lg:hidden flex justify-between pt-4 px-4'>
          <Bars3Icon className='w-6 h-6' onClick={() => setSidebarOpen(true)} />
          <a href='/'><Logo className='w-36 mb-2' /></a>
        </div>
        <main className='grow bg-gray-dark text-white p-4'>
          {children}
        </main>
      </div>
    </div>
  )
}
