import axios, {AxiosRequestConfig} from "axios";

// Add in API_KEY and ORG_ID
const API_KEY = "";
const ORG_ID = "";
const VERSION = "2024-03-12"

const headers = {
    Authorization: `token ${API_KEY}`,
    'Content-Type': 'application/json',
}; 

async function getCollectionsByOrgId(orgId: string): Promise<string[]> {
    const COLLECTIONS_URL = `https://api.snyk.io/rest/orgs/${orgId}/collections?version=${VERSION}`;

    const config: AxiosRequestConfig = {
        method: 'GET',
        url: COLLECTIONS_URL,
        headers,
    };

    try {
        const response = await axios(config);
        const collections = response.data.data.filter((collection: any) => collection.attributes.name.toLowerCase() == "juice shop");
        return collections.map((collection: { id: string }) => collection.id);
    } catch (error: unknown) {
        console.error('Error calling collections API: ', error);
        throw error;
    }
}

async function getSnykProjectsByCollectionId(collectionId: string): Promise<string[]> {
    const PROJECTS_URL = `https://api.snyk.io/rest/orgs/${ORG_ID}/collections/${collectionId}/relationships/projects?version=${VERSION}&limit=100`;
    
    const config: AxiosRequestConfig = {
        method: 'GET',
        url: PROJECTS_URL,
        headers,
    }; 

    try {
        const response = await axios(config);
        const projects = response.data.data;
        return projects.map((project: { id: string; }) => project.id);
    } catch (error: unknown) {
        console.error('Error calling Snyk API:', error);
        throw error;
    }
}

async function filterProjectsByOrigin(projectIds: string[]): Promise<any[]> {
    const projects = await Promise.all(projectIds.map(async projectId => {
        const PROJECT_URL = `https://api.snyk.io/rest/orgs/${ORG_ID}/projects/${projectId}?version=${VERSION}`
        const config: AxiosRequestConfig = {
            url: PROJECT_URL,
            method: 'GET',
            headers
        }

        try {
            const response = await axios(config);
            return response.data.data
        } catch (error: unknown) {
            console.error("Error calling projects api: ", error)
            throw error;
        }
    }))

    return projects.filter(project => {
        return project.attributes.origin == "cli"
    })
}

// Currently limiting to first 100 issues per project (would need to code in the iteration piece to get all issues but I'm lazy)
async function getIssuesByProjectIds(projects: any[]): Promise<any[]> {
    const issues = await Promise.all(projects.map(async project => {
        const id = project.id;
        const ISSUE_URL = `https://api.snyk.io/rest/orgs/${ORG_ID}/issues?limit=100&scan_item.id=${id}&scan_item.type=project&version=${VERSION}`;
        const config: AxiosRequestConfig = {
            url: ISSUE_URL,
            method: "GET",
            headers,
        };

        try {
            const response = await axios(config);
            return response.data.data;
        } catch (error) {
            console.error("error calling issues api: ", error);
            throw error
        }
    }))

    return issues.flat();
}

async function getCliIssuesFromProjectCollections() {
    const collections = await getCollectionsByOrgId(ORG_ID);
    if (collections[0] === undefined) throw Error("Didn't find any matching collection");
    const projects = await getSnykProjectsByCollectionId(collections[0]);
    const cliProjects = await filterProjectsByOrigin(projects);
    const issues = await getIssuesByProjectIds(cliProjects)

    console.log("example issue: ", issues[0])
    // Do something with these issues now
}

await getCliIssuesFromProjectCollections()
