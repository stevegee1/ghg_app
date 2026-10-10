import { AnchorPublisher, createEthersPublisher, readAnchorConfig } from './anchor-publisher';

let publisher: AnchorPublisher | null | undefined;

/** The configured publisher, created once; null when anchoring is not configured. */
export function getAnchorPublisher(): AnchorPublisher | null {
  if (publisher === undefined) {
    const config = readAnchorConfig();
    publisher = config ? createEthersPublisher(config) : null;
  }
  return publisher;
}

/** Replaces the publisher (tests only pass a chain double here). */
export function setAnchorPublisher(next: AnchorPublisher | null): void {
  publisher = next;
}
