function makeId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeCourseTitle(value) {
    const normalized = (value || '').trim().toLowerCase();
    return normalized.replace(/(^|[\s/()&:+-])([a-z])/g, (match, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

export function parseTopicList(rawTopics) {
    if (typeof rawTopics !== 'string') {
        return [];
    }

    const parts = /\r?\n/.test(rawTopics)
        ? rawTopics.split(/\r?\n/)
        : rawTopics.split(',');

    return parts
        .map((topic) => topic.trim())
        .filter(Boolean);
}

export function parseModulesInput(rawModules) {
    return (rawModules || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const separator = line.includes(':') ? ':' : line.includes('>') ? '>' : null;
            if (!separator) {
                return {
                    title: line,
                    topics: [],
                };
            }

            const [moduleTitleRaw, topicsRaw = ''] = line.split(separator);
            return {
                title: moduleTitleRaw.trim(),
                topics: parseTopicList(topicsRaw).map((topic) => ({ title: topic })),
            };
        })
        .filter((module) => module.title);
}

function normalizeTopic(topic) {
    const title = normalizeCourseTitle((topic?.title || '').trim());
    if (!title) return null;
    return {
        id: topic?.id || makeId(),
        title,
        completed: Boolean(topic?.completed),
    };
}

function uniqueTopics(topics) {
    const seen = new Set();
    return topics.filter((topic) => {
        const key = topic.title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function uniqueModules(modules) {
    const seen = new Set();
    return modules.filter((module) => {
        const key = module.title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function normalizeTopicTitles(topics) {
    if (Array.isArray(topics)) {
        return topics
            .map((topic) => normalizeTopic(typeof topic === 'string' ? { title: topic } : topic))
            .filter(Boolean);
    }

    if (typeof topics === 'string') {
        return normalizeTopicTitles(parseTopicList(topics));
    }

    return [];
}

export function normalizeModule(module) {
    const title = normalizeCourseTitle((module?.title || '').trim());
    if (!title) return null;

    const topics = Array.isArray(module?.topics)
        ? uniqueTopics(module.topics.map(normalizeTopic).filter(Boolean))
        : [];

    const completed = topics.length
        ? topics.every((topic) => topic.completed)
        : Boolean(module?.completed);

    return {
        id: module?.id || makeId(),
        title,
        completed,
        topics,
    };
}

function normalizeModules(modules) {
    if (!Array.isArray(modules)) return [];
    return uniqueModules(modules.map(normalizeModule).filter(Boolean));
}

export function normalizeCourse(course) {
    const title = normalizeCourseTitle((course?.title || '').trim());
    if (!title) return null;

    const modules = normalizeModules(course?.modules);
    const completed = modules.length
        ? modules.every((module) => module.completed)
        : Boolean(course?.completed);

    return {
        id: course?.id || makeId(),
        title,
        completed,
        modules,
    };
}

export function normalizeCourses(courses) {
    if (!Array.isArray(courses)) return [];
    return courses.map(normalizeCourse).filter(Boolean);
}

export function syncCourseCompletion(course) {
    const modules = course.modules.map((module) => {
        const topicsCompleted = module.topics.length
            ? module.topics.every((topic) => topic.completed)
            : module.completed;
        return {
            ...module,
            completed: topicsCompleted,
        };
    });

    return {
        ...course,
        modules,
        completed: modules.length ? modules.every((module) => module.completed) : course.completed,
    };
}

function replaceCourse(courses, courseId, updater) {
    let changed = false;
    const nextCourses = courses.map((course) => {
        if (course.id !== courseId) return course;
        const nextCourse = updater(course);
        if (nextCourse === course) {
            return course;
        }
        changed = true;
        return nextCourse;
    });

    return { changed, courses: changed ? nextCourses : courses };
}

export function addCourse(courses, { title, modules }) {
    const safeTitle = normalizeCourseTitle((title || '').trim());
    const safeModules = normalizeModules(modules);

    if (!safeTitle || !safeModules.length) {
        return { changed: false, courses };
    }

    return {
        changed: true,
        courses: [
            {
                id: makeId(),
                title: safeTitle,
                completed: false,
                modules: safeModules,
            },
            ...courses,
        ],
    };
}

export function deleteCourse(courses, courseId) {
    const nextCourses = courses.filter((course) => course.id !== courseId);
    return {
        changed: nextCourses.length !== courses.length,
        courses: nextCourses,
    };
}

export function toggleModuleCompletion(courses, courseId, moduleId, completed) {
    return replaceCourse(courses, courseId, (course) => {
        let changed = false;
        const updated = {
            ...course,
            modules: course.modules.map((module) => {
                if (module.id !== moduleId) return module;
                changed = true;
                return {
                    ...module,
                    completed,
                    topics: module.topics.map((topic) => ({
                        ...topic,
                        completed,
                    })),
                };
            }),
        };

        return changed ? syncCourseCompletion(updated) : course;
    });
}

export function toggleTopicCompletion(courses, courseId, moduleId, topicId, completed) {
    return replaceCourse(courses, courseId, (course) => {
        let changed = false;
        const updated = {
            ...course,
            modules: course.modules.map((module) => {
                if (module.id !== moduleId) return module;

                const nextTopics = module.topics.map((topic) => {
                    if (topic.id !== topicId) return topic;
                    changed = true;
                    return { ...topic, completed };
                });

                return changed
                    ? {
                        ...module,
                        topics: nextTopics,
                    }
                    : module;
            }),
        };

        return changed ? syncCourseCompletion(updated) : course;
    });
}

export function addTopicsToModule(courses, courseId, moduleId, topics) {
    const nextTopicEntries = normalizeTopicTitles(topics).map((topic) => ({
        ...topic,
        completed: false,
    }));
    if (!nextTopicEntries.length) {
        return { changed: false, courses };
    }

    return replaceCourse(courses, courseId, (course) => {
        let changed = false;
        const updated = {
            ...course,
            modules: course.modules.map((module) => {
                if (module.id !== moduleId) return module;

                const nextTopics = uniqueTopics([
                    ...module.topics,
                    ...nextTopicEntries,
                ]);

                if (nextTopics.length === module.topics.length) {
                    return module;
                }

                changed = true;
                return {
                    ...module,
                    completed: false,
                    topics: nextTopics,
                };
            }),
        };

        return changed ? syncCourseCompletion(updated) : course;
    });
}

export function addModuleToCourse(courses, courseId, module) {
    const safeModule = normalizeModule(module);
    if (!safeModule) {
        return { changed: false, courses };
    }

    return replaceCourse(courses, courseId, (course) => {
        const nextModules = uniqueModules([
            ...course.modules,
            {
                ...safeModule,
                completed: false,
            },
        ]);

        if (nextModules.length === course.modules.length) {
            return course;
        }

        return syncCourseCompletion({
            ...course,
            completed: false,
            modules: nextModules,
        });
    });
}

export function deleteModuleFromCourse(courses, courseId, moduleId) {
    return replaceCourse(courses, courseId, (course) => {
        const nextModules = course.modules.filter((module) => module.id !== moduleId);
        if (nextModules.length === course.modules.length) {
            return course;
        }

        return syncCourseCompletion({
            ...course,
            modules: nextModules,
        });
    });
}

export function deleteTopicFromModule(courses, courseId, moduleId, topicId) {
    return replaceCourse(courses, courseId, (course) => {
        let changed = false;
        const updatedCourse = {
            ...course,
            modules: course.modules.map((module) => {
                if (module.id !== moduleId) return module;

                const nextTopics = module.topics.filter((topic) => topic.id !== topicId);
                if (nextTopics.length === module.topics.length) {
                    return module;
                }

                changed = true;
                return {
                    ...module,
                    topics: nextTopics,
                };
            }),
        };

        return changed ? syncCourseCompletion(updatedCourse) : course;
    });
}
