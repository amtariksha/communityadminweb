/** PROF-40: the community admin writes, publishes and switches the agreement (the API re-checks). */
export const AGREEMENT_EDITORS: ReadonlySet<string> = new Set(['super_admin', 'community_admin']);

export const PUBLISH_QUESTION = 'Publish this version? Residents will be asked to accept again.';
export const ENABLE_QUESTION = 'Switch on the user agreement? Residents will be asked to accept it the next time they open the app or the website.';

export const NOT_AVAILABLE = 'The user agreement is not available yet.';
