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
        if (!response.ok) {
            throw new Error(`Suggestion request failed: ${response.status}`);
        }
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
    const query = buildUserQuery(user);
    const response = await fetch(`${apiBase}/saved_topics?${query}`, { signal });
    if (!response.ok) {
        throw new Error(`Failed to load saved topics (${response.status}).`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((topic) => ({
        id: topic.id,
        prompt: topic.title,
        collectionId: topic.collection_id || null,
    }));
}

export async function createSavedTopic(apiBase, user, title, collectionId = null) {
    const query = buildUserQuery(user);
    const normalizedTitle = (title || "").trim();
    if (!normalizedTitle) {
        throw new Error("Title is required to save a topic.");
    }
    const body = { title: normalizedTitle };
    if (collectionId) {
        body.collection_id = collectionId;
    }
    const response = await fetch(`${apiBase}/saved_topics?${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`Failed to save topic (${response.status}).`);
    }
    const topic = await response.json();
    return {
        id: topic.id,
        prompt: topic.title,
        collectionId: topic.collection_id || null,
    };
}

export async function updateSavedTopic(apiBase, user, topicId, { collectionId } = {}) {
    const query = buildUserQuery(user);
    const body = {};
    if (collectionId !== undefined) {
        body.collection_id = collectionId;
    }
    const response = await fetch(`${apiBase}/saved_topics/${topicId}?${query}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`Failed to update topic (${response.status}).`);
    }
    const topic = await response.json();
    return {
        id: topic.id,
        prompt: topic.title,
        collectionId: topic.collection_id || null,
    };
}

export async function deleteSavedTopic(apiBase, user, topicId) {
    const query = buildUserQuery(user);
    const response = await fetch(`${apiBase}/saved_topics/${topicId}?${query}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        throw new Error(`Failed to delete topic (${response.status}).`);
    }
}

export async function fetchSavedReports(apiBase, user, { includeContent = true, signal } = {}) {
    const query = buildUserQuery(user);
    const url = includeContent
        ? `${apiBase}/reports?${query}&include_content=1`
        : `${apiBase}/reports?${query}`;
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(`Failed to load reports (${response.status}).`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((report) => ({
        id: report.id,
        topic: report.topic || "",
        title: report.title || report.topic || "Explorer Report",
        content: report.content || "",
        preview: report.summary || summarizeReport(report.content || report.title || report.topic || ""),
    }));
}

export async function deleteSavedReport(apiBase, user, reportId) {
    const query = buildUserQuery(user);
    const response = await fetch(`${apiBase}/reports/${reportId}?${query}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        throw new Error(`Failed to delete report (${response.status}).`);
    }
}

export async function fetchCollections(apiBase, user, { signal } = {}) {
    const query = buildUserQuery(user);
    const response = await fetch(`${apiBase}/collections?${query}`, { signal });
    if (!response.ok) {
        throw new Error(`Failed to load collections (${response.status}).`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((collection) => ({
        id: collection.id,
        name: collection.name,
        description: collection.description || null,
        color: collection.color || null,
        icon: collection.icon || null,
        position: collection.position || 0,
        topicCount: collection.topic_count || 0,
    }));
}

export async function createCollection(apiBase, user, { name, description, color, icon } = {}) {
    const query = buildUserQuery(user);
    const normalizedName = (name || "").trim();
    if (!normalizedName) {
        throw new Error("Collection name is required.");
    }
    const body = { name: normalizedName };
    if (description) body.description = description.trim();
    if (color) body.color = color.trim();
    if (icon) body.icon = icon.trim();

    const response = await fetch(`${apiBase}/collections?${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create collection (${response.status}).`);
    }
    const collection = await response.json();
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

export async function updateCollection(apiBase, user, collectionId, updates = {}) {
    const query = buildUserQuery(user);
    const body = {};
    if (updates.name !== undefined) body.name = updates.name;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.color !== undefined) body.color = updates.color;
    if (updates.icon !== undefined) body.icon = updates.icon;
    if (updates.position !== undefined) body.position = updates.position;

    const response = await fetch(`${apiBase}/collections/${collectionId}?${query}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to update collection (${response.status}).`);
    }
    const collection = await response.json();
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

export async function deleteCollection(apiBase, user, collectionId) {
    const query = buildUserQuery(user);
    const response = await fetch(`${apiBase}/collections/${collectionId}?${query}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        throw new Error(`Failed to delete collection (${response.status}).`);
    }
}

export { buildUserQuery };
