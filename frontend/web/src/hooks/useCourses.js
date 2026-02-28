import { useCallback, useEffect, useState } from 'react';
import { COURSES_STORAGE_KEY } from '../utils/constants';
import { loadSavedList, persistList } from '../utils/storage';

function makeId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function capitalizeTitle(value) {
    const normalized = (value || '').trim().toLowerCase();
    return normalized.replace(/(^|[\s/()&:+-])([a-z])/g, (match, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

function normalizeTopic(topic) {
    const title = capitalizeTitle((topic?.title || '').trim());
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

function normalizeModule(module) {
    const title = capitalizeTitle((module?.title || '').trim());
    if (!title) return null;

    const topics = Array.isArray(module?.topics)
        ? module.topics.map(normalizeTopic).filter(Boolean)
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

function normalizeCourse(course) {
    const title = capitalizeTitle((course?.title || '').trim());
    if (!title) return null;

    const modules = Array.isArray(course?.modules)
        ? course.modules.map(normalizeModule).filter(Boolean)
        : [];

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

function normalizeCourses(courses) {
    if (!Array.isArray(courses)) return [];
    return courses.map(normalizeCourse).filter(Boolean);
}

function syncCourseCompletion(course) {
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

export function useCourses() {
    const [courses, setCourses] = useState(() => normalizeCourses(loadSavedList(COURSES_STORAGE_KEY)));

    useEffect(() => {
        persistList(COURSES_STORAGE_KEY, courses);
    }, [courses]);

    const addCourse = useCallback(({ title, modules }) => {
        const safeTitle = capitalizeTitle((title || '').trim());
        const safeModules = Array.isArray(modules)
            ? modules
                .map((module) => normalizeModule(module))
                .filter(Boolean)
            : [];

        if (!safeTitle || !safeModules.length) {
            return false;
        }

        setCourses((current) => [
            {
                id: makeId(),
                title: safeTitle,
                completed: false,
                modules: safeModules,
            },
            ...current,
        ]);

        return true;
    }, []);

    const deleteCourse = useCallback((courseId) => {
        setCourses((current) => current.filter((course) => course.id !== courseId));
    }, []);

    const toggleCourse = useCallback((courseId, completed) => {
        setCourses((current) =>
            current.map((course) => {
                if (course.id !== courseId) return course;
                return {
                    ...course,
                    completed,
                    modules: course.modules.map((module) => ({
                        ...module,
                        completed,
                        topics: module.topics.map((topic) => ({
                            ...topic,
                            completed,
                        })),
                    })),
                };
            })
        );
    }, []);

    const toggleModule = useCallback((courseId, moduleId, completed) => {
        setCourses((current) =>
            current.map((course) => {
                if (course.id !== courseId) return course;

                const updated = {
                    ...course,
                    modules: course.modules.map((module) => {
                        if (module.id !== moduleId) return module;
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

                return syncCourseCompletion(updated);
            })
        );
    }, []);

    const toggleTopic = useCallback((courseId, moduleId, topicId, completed) => {
        setCourses((current) =>
            current.map((course) => {
                if (course.id !== courseId) return course;

                const updated = {
                    ...course,
                    modules: course.modules.map((module) => {
                        if (module.id !== moduleId) return module;
                        return {
                            ...module,
                            topics: module.topics.map((topic) => (
                                topic.id === topicId
                                    ? { ...topic, completed }
                                    : topic
                            )),
                        };
                    }),
                };

                return syncCourseCompletion(updated);
            })
        );
    }, []);

    const addTopicToModule = useCallback((courseId, moduleId, topicTitle) => {
        const safeTitle = capitalizeTitle((topicTitle || '').trim());
        if (!safeTitle) return false;

        let changed = false;

        setCourses((current) =>
            current.map((course) => {
                if (course.id !== courseId) return course;

                const updated = {
                    ...course,
                    modules: course.modules.map((module) => {
                        if (module.id !== moduleId) return module;

                        const nextTopics = uniqueTopics([
                            ...module.topics,
                            {
                                id: makeId(),
                                title: safeTitle,
                                completed: false,
                            },
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

                return syncCourseCompletion(updated);
            })
        );

        return changed;
    }, []);

    const addModuleToCourse = useCallback((courseId, module) => {
        const safeModule = normalizeModule(module);
        if (!safeModule) return false;

        let changed = false;

        setCourses((current) =>
            current.map((course) => {
                if (course.id !== courseId) return course;

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

                changed = true;
                return syncCourseCompletion({
                    ...course,
                    completed: false,
                    modules: nextModules,
                });
            })
        );

        return changed;
    }, []);

    const deleteModuleFromCourse = useCallback((courseId, moduleId) => {
        setCourses((current) =>
            current.map((course) => {
                if (course.id !== courseId) return course;

                const nextModules = course.modules.filter((module) => module.id !== moduleId);
                if (nextModules.length === course.modules.length) {
                    return course;
                }

                return syncCourseCompletion({
                    ...course,
                    modules: nextModules,
                });
            })
        );
    }, []);

    const deleteTopicFromModule = useCallback((courseId, moduleId, topicId) => {
        setCourses((current) =>
            current.map((course) => {
                if (course.id !== courseId) return course;

                const updatedCourse = {
                    ...course,
                    modules: course.modules.map((module) => {
                        if (module.id !== moduleId) return module;

                        const nextTopics = module.topics.filter((topic) => topic.id !== topicId);
                        if (nextTopics.length === module.topics.length) {
                            return module;
                        }

                        return {
                            ...module,
                            topics: nextTopics,
                        };
                    }),
                };

                return syncCourseCompletion(updatedCourse);
            })
        );
    }, []);

    return {
        courses,
        addCourse,
        deleteCourse,
        toggleCourse,
        toggleModule,
        toggleTopic,
        addTopicToModule,
        addModuleToCourse,
        deleteModuleFromCourse,
        deleteTopicFromModule,
    };
}
