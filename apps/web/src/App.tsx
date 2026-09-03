import { BrowserRouter } from "react-router-dom";

import { PortalApplication } from "./portal/PortalApplication.js";

export function App() {
  return (
    <BrowserRouter>
      <PortalApplication />
    </BrowserRouter>
  );
}
