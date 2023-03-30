interface LinkProps {
  className?: string
  href: string
  children: string | JSX.Element | JSX.Element[]
}
export const Link = ({ className = '', ...props }: LinkProps) => (
  <a className={`underline ${className}`} {...props} />
)