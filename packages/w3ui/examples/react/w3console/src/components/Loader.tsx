import { ArrowPathIcon } from '@heroicons/react/20/solid'

export default ({ className = '' }: { className?: string }) => (
  <ArrowPathIcon className={`animate-spin ${className}`} />
)
