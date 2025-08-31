/**
 * Top-level App component for the React application.
 * Keeps the app lightweight by rendering a single page component (LinkPage).
 * If you add routing later, this component can host <Routes> and multiple pages.
 */
import React from "react";
import LinkPage from "./pages/LinkPage.jsx"; // Main screen that handles Plaid link, caching, and subscriptions UI

const App = () => {
	/**
	 * Render the primary page. Currently no router logic here—App is a simple wrapper.
	 */
	return <LinkPage />;
};

/**
 * Export as default so index.jsx can import and render <App />
 */
export default App;
