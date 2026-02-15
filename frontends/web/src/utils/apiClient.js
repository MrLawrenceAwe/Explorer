import { summarizeReport } from "./text";

function buildUserQuery(user) {
    const email = (user?.email || "").trim();
    if (!email) {
        throw new Error("User email is required for this action.");
    }
    const params = new URLSearchParams({ user_email: email });
    const username = (user?.username || "").trim();
    if (username) {
        params.set("username", username);
    }
    return params.toString();
}

function withUserQuery(apiBase, path, user) {
    return `${apiBase}${path}?${buildUserQuery(user)}`;
}

async function parseErrorDetail(response) {
    try {
        const payload = await response.clone().json();
        if (typeof payload?.detail === "string") {
            return payload.detail;
        }
    } catch {
        // ignore JSON parse failures
    }
    return null;
}

async function ensureOk(response, fallbackMessage, { includeDetail = false } = {}) {
    if (response.ok) return;
    if (includeDetail) {
        const detail = await parseErrorDetail(response);
        if (detail) {
            throw new Error(detail);
        }
    }
    throw new Error(fallbackMessage);
}

function mapSavedTopic(topic) {
    return {
        id: topic.id,
        prompt: topic.title,
        collectionId: topic.collection_id || null,
    };
}

function mapCollection(collection) {
    return {
        id: collection.id,
        name: collection.name,
        description: collection.description || null,
        color: collection.color || null,
        icon: collection.icon || null,
        position: collection.position || 0,
        topicCount: collection.topic_count || 0,
    };
}

function mapSavedReport(report) {
    return {
        id: report.id,
        topic: report.topic || "",
        title: report.title || report.topic || "Explorer Report",
        content: report.content || "",
        preview: report.summary || summarizeReport(report.content || report.title || report.topic || ""),
    };
}

export async function fetchTopicSuggestions(
    apiBase,
    {
        topic,
        seeds = [],
        includeReportHeadings = true,
        model,
        signal,
    } = {}
) {
    const modelSpec = model ? { model } : undefined;
    const payload = {
        topic: topic || "",
        seeds: Array.isArray(seeds) ? seeds : [],
        include_report_headings: Boolean(includeReportHeadings),
        ...(modelSpec ? { model: modelSpec } : {}),
    };
    try {
        const response = await fetch(`${apiBase}/suggestions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal,
        });
        await ensureOk(response, `Suggestion request failed: ${response.status}`);
        const data = await response.json();
        const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
        return suggestions
            .map((entry) => {
                if (typeof entry === "string") return entry;
                if (entry && typeof entry === "object") {
                    return (entry.title || entry.topic || "").trim();
                }
                return "";
            })
            .filter(Boolean);
    } catch (error) {
        if (!(error && error.name === "AbortError")) {
            console.warn("Failed to fetch topic suggestions", error);
        }
        return [];
    }
}

export async function fetchSavedTopics(apiBase, user, { signal } = {}) {
    const response = await fetch(withUserQuery(apiBase, "/saved_topics", user), { signal });
    await ensureOk(response, `Failed to load saved topics (${response.status}).`);
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map(mapSavedTopic);
}

export async function createSavedTopic(apiBase, user, title, collectionId = null) {
    const normalizedTitle = (title || "").trim();
    if (!normalizedTitle) {
        throw new Error("Title is required to save a topic.");
    }
    const body = { title: normalizedTitle };
    if (collectionId) {
        body.collection_id = collectionId;
    }
    const response = await fetch(withUserQuery(apiBase, "/saved_topics", user), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    await ensureOk(response, `Failed to save topic (${response.status}).`);
    const topic = await response.json();
    return mapSavedTopic(topic);
}

export async function updateSavedTopic(apiBase, user, topicId, { collectionId } = {}) {
    const body = {};
    if (collectionId !== undefined) {
        body.collection_id = collectionId;
    }
    const response = await fetch(withUserQuery(apiBase, `/saved_topics/${topicId}`, user), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    await ensureOk(response, `Failed to update topic (${response.status}).`);
    const topic = await response.json();
    return mapSavedTopic(topic);
}

export async function deleteSavedTopic(apiBase, user, topicId) {
    const response = await fetch(withUserQuery(apiBase, `/saved_topics/${topicId}`, user), {
        method: "DELETE",
    });
    await ensureOk(response, `Failed to delete topic (${response.status}).`);
}

export async function fetchSavedReports(apiBase, user, { includeContent = true, signal } = {}) {
    const query = buildUserQuery(user);
    const url = includeContent
        ? `${apiBase}/reports?${query}&include_content=1`
        : `${apiBase}/reports?${query}`;
    const response = await fetch(url, { signal });
    await ensureOk(response, `Failed to load reports (${response.status}).`);
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map(mapSavedReport);
}

export async function deleteSavedReport(apiBase, user, reportId) {
    const response = await fetch(withUserQuery(apiBase, `/reports/${reportId}`, user), {
        method: "DELETE",
    });
    await ensureOk(response, `Failed to delete report (${response.status}).`);
}

export async function fetchCollections(apiBase, user, { signal } = {}) {
    const response = await fetch(withUserQuery(apiBase, "/collections", user), { signal });
    await ensureOk(response, `Failed to load collections (${response.status}).`);
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map(mapCollection);
}

export async function createCollection(apiBase, user, { name, description, color, icon } = {}) {
    const normalizedName = (name || "").trim();
    if (!normalizedName) {
        throw new Error("Collection name is required.");
    }
    const body = { name: normalizedName };
    if (description) body.description = description.trim();
    if (color) body.color = color.trim();
    if (icon) body.icon = icon.trim();

    const response = await fetch(withUserQuery(apiBase, "/collections", user), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    await ensureOk(response, `Failed to create collection (${response.status}).`, {
        includeDetail: true,
    });
    const collection = await response.json();
    return mapCollection(collection);
}

export async function updateCollection(apiBase, user, collectionId, updates = {}) {
    const body = {};
    if (updates.name !== undefined) body.name = updates.name;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.color !== undefined) body.color = updates.color;
    if (updates.icon !== undefined) body.icon = updates.icon;
    if (updates.position !== undefined) body.position = updates.position;

    const response = await fetch(withUserQuery(apiBase, `/collections/${collectionId}`, user), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    await ensureOk(response, `Failed to update collection (${response.status}).`, {
        includeDetail: true,
    });
    const collection = await response.json();
    return mapCollection(collection);
}

export async function deleteCollection(apiBase, user, collectionId) {
    const response = await fetch(withUserQuery(apiBase, `/collections/${collectionId}`, user), {
        method: "DELETE",
    });
    await ensureOk(response, `Failed to delete collection (${response.status}).`);
}

export { buildUserQuery };
