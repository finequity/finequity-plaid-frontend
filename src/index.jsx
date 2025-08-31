/**
 * Entry point for the React application.
 * Attaches the app to the <div id="root"> in public/index.html
 * Wraps the app with a BrowserRouter to enable client-side routing (react-router)
 */

import React from "react";
import ReactDOM from "react-dom/client";          
import { BrowserRouter } from "react-router-dom"; 
import App from "./App";                           


/**
 * Create a root for React 18 and bind it to the DOM node with id="root".
 */
const root = ReactDOM.createRoot(document.getElementById("root"));

/**
 * Render the component tree.
 * BrowserRouter enables <Routes>/<Route> inside App for SPA navigation.
 */
root.render(
	<BrowserRouter>
		<App />
	</BrowserRouter>
);
