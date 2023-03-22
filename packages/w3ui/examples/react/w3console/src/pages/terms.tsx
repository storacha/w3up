export default function Terms () {
  const serviceName = import.meta.env.VITE_W3UP_SERVICE_BRAND_NAME || 'dev.web3.storage'
  return (
    <div className='flex flex-col justify-start items-center min-h-full w-full bg-gray-900 text-white p-8'>
      <h1 className='text-2xl my-4 font-bold'>
        Terms of Service
      </h1>
      <p className='max-w-xl leading-relaxed'>
        By registering with {serviceName} w3up beta,
        you agree to the Terms of Service (link). If you have an existing
        non-w3up beta account with {serviceName} and register
        for the w3up beta version of {serviceName} using
        the same email, then at the end of the beta period, these accounts
        will be combined. Until the beta period is over and this migration
        occurs, uploads to w3up will not appear in your {serviceName}
        account (and vice versa), even if you register with the same email.
      </p>
    </div>
  )
}
