// Stub: types/connectorText — not in public source snapshot
export type ConnectorTextBlock = { type: 'connector_text'; text: string }
export function isConnectorTextBlock(block: unknown): block is ConnectorTextBlock {
  return typeof block === 'object' && block !== null && (block as ConnectorTextBlock).type === 'connector_text'
}
export default {}
