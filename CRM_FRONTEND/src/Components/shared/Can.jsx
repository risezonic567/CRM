import { can } from '../roles';

/**
 * Conditionally render children when the current user can perform `do`.
 * Usage: <Can do="call.create"><button>…</button></Can>
 */
const Can = ({ do: action, children, fallback = null }) => {
  if (!can(action)) return fallback;
  return children;
};

export default Can;
