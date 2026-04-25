import type { PropsWithChildren } from "react"; export function Tooltip({ children }: PropsWithChildren) { return <span role="tooltip">{children}</span>; }
