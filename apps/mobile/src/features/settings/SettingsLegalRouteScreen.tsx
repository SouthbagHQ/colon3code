import { SettingsLegalDocumentRouteScreen } from "./components/SettingsLegalDocumentRouteScreen";
import { LEGAL_URL } from "./lib/legal-document-url";

export function SettingsLegalRouteScreen() {
  return <SettingsLegalDocumentRouteScreen documentName="legal" documentUrl={LEGAL_URL} />;
}
