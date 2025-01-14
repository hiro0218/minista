import type { HelmetProps } from "react-helmet"

import { Helmet } from "react-helmet"

type HeadProps = HelmetProps

export const Head = (props: HeadProps) => {
  const { children, ...attribute } = props
  return <Helmet {...attribute}>{children}</Helmet>
}
