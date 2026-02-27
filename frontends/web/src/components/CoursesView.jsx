import React, { useState } from 'react';

function parseModules(rawModules) {
    const lines = (rawModules || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    return lines
        .map((line) => {
            const separator = line.includes(':') ? ':' : line.includes('>') ? '>' : null;
            if (!separator) {
                return {
                    title: line,
                    topics: [],
                };
            }

            const [moduleTitleRaw, topicsRaw = ''] = line.split(separator);
            const title = moduleTitleRaw.trim();
            const topics = topicsRaw
                .split(',')
                .map((topic) => topic.trim())
                .filter(Boolean)
                .map((topic) => ({ title: topic }));

            return {
                title,
                topics,
            };
        })
        .filter((module) => module.title);
}

export function CoursesView({
    courses,
    onAddCourse,
    onDeleteCourse,
    onToggleCourse,
    onToggleModule,
    onToggleTopic,
    onAddTopicToModule,
    onAddModuleToCourse,
}) {
    const [courseTitle, setCourseTitle] = useState('');
    const [modulesText, setModulesText] = useState('');
    const [formError, setFormError] = useState('');
    const [moduleEditorCourseId, setModuleEditorCourseId] = useState(null);
    const [moduleDraft, setModuleDraft] = useState('');
    const [moduleError, setModuleError] = useState('');
    const [topicEditorModuleId, setTopicEditorModuleId] = useState(null);
    const [topicDraft, setTopicDraft] = useState('');
    const [topicError, setTopicError] = useState('');

    const hasCourses = courses.length > 0;

    const handleSubmit = (event) => {
        event.preventDefault();

        const title = courseTitle.trim();
        const modules = parseModules(modulesText);

        if (!title) {
            setFormError('Enter a course title.');
            return;
        }
        if (!modules.length) {
            setFormError('Add at least one module line.');
            return;
        }

        const created = onAddCourse({ title, modules });
        if (!created) {
            setFormError('Could not create course. Check your module format.');
            return;
        }

        setFormError('');
        setCourseTitle('');
        setModulesText('');
    };

    const handleOpenModuleEditor = (event, courseId) => {
        event.preventDefault();
        event.stopPropagation();
        setModuleEditorCourseId(courseId);
        setModuleDraft('');
        setModuleError('');
    };

    const handleModuleSubmit = (event, courseId) => {
        event.preventDefault();
        event.stopPropagation();
        const parsedModule = parseModules(moduleDraft)[0];
        if (!parsedModule) {
            setModuleError('Enter a module name.');
            return;
        }
        const created = onAddModuleToCourse(courseId, parsedModule);
        if (!created) {
            setModuleError('Module already exists in this course.');
            return;
        }
        setModuleEditorCourseId(null);
        setModuleDraft('');
        setModuleError('');
    };

    const handleOpenTopicEditor = (event, moduleId) => {
        event.preventDefault();
        event.stopPropagation();
        setTopicEditorModuleId(moduleId);
        setTopicDraft('');
        setTopicError('');
    };

    const handleTopicSubmit = (event, courseId, moduleId) => {
        event.preventDefault();
        event.stopPropagation();
        const safeTitle = topicDraft.trim();
        if (!safeTitle) {
            setTopicError('Enter a topic name.');
            return;
        }
        const created = onAddTopicToModule(courseId, moduleId, safeTitle);
        if (!created) {
            setTopicError('Topic already exists in this module.');
            return;
        }
        setTopicEditorModuleId(null);
        setTopicDraft('');
        setTopicError('');
    };

    return (
        <section className="courses-page" aria-label="Courses">
            <header className="courses-page__header">
                <div>
                    <h1>Courses</h1>
                </div>
            </header>

            <form className="courses-form" onSubmit={handleSubmit}>
                <label className="courses-form__field">
                    <span>Course Title</span>
                    <input
                        type="text"
                        value={courseTitle}
                        onChange={(event) => setCourseTitle(event.target.value)}
                        placeholder="e.g. Full-Stack TypeScript"
                        autoComplete="off"
                    />
                </label>
                <label className="courses-form__field">
                    <span>Modules and Topics (One Module per Line)</span>
                    <textarea
                        rows={4}
                        value={modulesText}
                        onChange={(event) => setModulesText(event.target.value)}
                        placeholder={[
                            'Foundations: Variables, Control Flow, Functions',
                            'Backend > APIs, Authentication, Testing',
                            'Deployment',
                        ].join('\n')}
                    />
                </label>
                <div className="courses-form__footer">
                    <p className="courses-form__hint">Use `Module: Topic A, Topic B` or `Module &gt; Topic A, Topic B`.</p>
                    <button type="submit">Create Course</button>
                </div>
                {formError ? <p className="courses-form__error">{formError}</p> : null}
            </form>

            {hasCourses ? (
                <div className="courses-tree" aria-label="Course List">
                    {courses.map((course) => {
                        return (
                            <details key={course.id} className="courses-tree__course" open>
                                <summary className="courses-tree__summary">
                                    <label
                                        className="courses-tree__check"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={course.completed}
                                            onChange={(event) => onToggleCourse(course.id, event.target.checked)}
                                            aria-label={`Mark ${course.title} complete`}
                                        />
                                        <span>{course.title}</span>
                                    </label>
                                    <div className="courses-tree__summary-right">
                                        <span>
                                            {course.modules.filter((module) => module.completed).length}/{course.modules.length} modules
                                        </span>
                                        <span>
                                            {course.modules.flatMap((module) => module.topics).filter((topic) => topic.completed).length}/{course.modules.flatMap((module) => module.topics).length} topics
                                        </span>
                                        <button
                                            type="button"
                                            className="courses-tree__add"
                                            onClick={(event) => handleOpenModuleEditor(event, course.id)}
                                            aria-label={`Add module to ${course.title}`}
                                        >
                                            + Add Module
                                        </button>
                                        <button
                                            type="button"
                                            className="courses-tree__delete"
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                onDeleteCourse(course.id);
                                            }}
                                            aria-label={`Delete ${course.title}`}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </summary>
                                {moduleEditorCourseId === course.id ? (
                                    <form className="courses-inline-form" onSubmit={(event) => handleModuleSubmit(event, course.id)}>
                                        <input
                                            type="text"
                                            value={moduleDraft}
                                            onChange={(event) => {
                                                setModuleDraft(event.target.value);
                                                setModuleError('');
                                            }}
                                            placeholder="Module or Module: Topic A, Topic B"
                                            aria-label={`Module name for ${course.title}`}
                                        />
                                        <button type="submit">Add</button>
                                        <button
                                            type="button"
                                            className="courses-inline-form__cancel"
                                            onClick={() => {
                                                setModuleEditorCourseId(null);
                                                setModuleDraft('');
                                                setModuleError('');
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        {moduleError ? <p className="courses-inline-form__error">{moduleError}</p> : null}
                                    </form>
                                ) : null}
                                <ul className="courses-tree__modules">
                                    {course.modules.map((module) => (
                                        <li key={module.id}>
                                            <details className="courses-tree__module" open>
                                                <summary className="courses-tree__module-summary">
                                                    <label
                                                        className="courses-tree__check"
                                                        onClick={(event) => event.stopPropagation()}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={module.completed}
                                                            onChange={(event) => onToggleModule(course.id, module.id, event.target.checked)}
                                                            aria-label={`Mark module ${module.title} complete`}
                                                        />
                                                        <span>{module.title}</span>
                                                    </label>
                                                    <div className="courses-tree__module-actions">
                                                        <span className="courses-tree__topic-count">
                                                            {module.topics.filter((topic) => topic.completed).length}/{module.topics.length} topics
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="courses-tree__add"
                                                            onClick={(event) => handleOpenTopicEditor(event, module.id)}
                                                            aria-label={`Add topic to ${module.title}`}
                                                        >
                                                            + Add Topic
                                                        </button>
                                                    </div>
                                                </summary>

                                                {module.topics.length > 0 ? (
                                                    <ul className="courses-tree__topics">
                                                        {module.topics.map((topic) => (
                                                            <li key={topic.id}>
                                                                <label className="courses-tree__check courses-tree__check--topic">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={topic.completed}
                                                                        onChange={(event) =>
                                                                            onToggleTopic(course.id, module.id, topic.id, event.target.checked)
                                                                        }
                                                                        aria-label={`Mark topic ${topic.title} complete`}
                                                                    />
                                                                    <span>{topic.title}</span>
                                                                </label>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="courses-tree__empty">No topics in this module.</p>
                                                )}
                                                {topicEditorModuleId === module.id ? (
                                                    <form className="courses-inline-form" onSubmit={(event) => handleTopicSubmit(event, course.id, module.id)}>
                                                        <input
                                                            type="text"
                                                            value={topicDraft}
                                                            onChange={(event) => {
                                                                setTopicDraft(event.target.value);
                                                                setTopicError('');
                                                            }}
                                                            placeholder="Topic Name"
                                                            aria-label={`Topic name for ${module.title}`}
                                                        />
                                                        <button type="submit">Add</button>
                                                        <button
                                                            type="button"
                                                            className="courses-inline-form__cancel"
                                                            onClick={() => {
                                                                setTopicEditorModuleId(null);
                                                                setTopicDraft('');
                                                                setTopicError('');
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                        {topicError ? <p className="courses-inline-form__error">{topicError}</p> : null}
                                                    </form>
                                                ) : null}
                                            </details>
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        );
                    })}
                </div>
            ) : (
                <p className="courses-empty">No courses yet. Create one above to start tracking progress.</p>
            )}
        </section>
    );
}
