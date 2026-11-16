interface Props {
  error: { code: string; strategy?: string }
}

export function ErrorBadge({ error }: Props): JSX.Element | null {
  return (error.code === 'LENGTH_OUT_OF_RANGE' && error.strategy === 'cuid') ? <strong>Invalid length</strong> : null
}
