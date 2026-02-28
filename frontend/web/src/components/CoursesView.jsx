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

function PlusIcon() {
    return (
        <svg className="courses-tree__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg className="courses-tree__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
        </svg>
    );
}

function getGenerationLabel(scopeType) {
    switch (scopeType) {
        case 'course':
            return 'Course reports';
        case 'module':
            return 'Module reports';
        case 'topic':
            return 'Topic report';
        default:
            return 'Report generation';
    }
}

export function CoursesView({
    courses,
    onAddCourse,
    onDeleteCourse,
    onDeleteModule,
    onDeleteTopic,
    onToggleModule,
    onToggleTopic,
    onAddTopicToModule,
    onAddModuleToCourse,
    onGenerateTopicReport,
    onGenerateModuleReports,
    onGenerateCourseReports,
    onCancelGeneration,
    generationProgress,
    isRunning,
}) {
    const [courseTitle, setCourseTitle] = useState('');
    const [modulesText, setModulesText] = useState('');
    const [formError, setFormError] = useState('');
    const [isCourseFormOpen, setIsCourseFormOpen] = useState(false);
    const [moduleEditorCourseId, setModuleEditorCourseId] = useState(null);
    const [moduleDraft, setModuleDraft] = useState('');
    const [moduleError, setModuleError] = useState('');
    const [topicEditorModuleId, setTopicEditorModuleId] = useState(null);
    const [topicDraft, setTopicDraft] = useState('');
    const [topicError, setTopicError] = useState('');

    const hasCourses = courses.length > 0;
    const progressValue = generationProgress
        ? generationProgress.state === 'running'
            ? Math.min(
                generationProgress.totalTopics,
                generationProgress.completedTopics + generationProgress.currentTopicProgress
            )
            : generationProgress.completedTopics
        : 0;
    const progressPercent = generationProgress?.totalTopics
        ? Math.round((progressValue / generationProgress.totalTopics) * 100)
        : 0;

    const closeCourseForm = ({ clearDraft = false } = {}) => {
        setIsCourseFormOpen(false);
        setFormError('');
        if (clearDraft) {
            setCourseTitle('');
            setModulesText('');
        }
    };

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
        closeCourseForm();
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
                {!isCourseFormOpen ? (
                    <button
                        type="button"
                        className="courses-page__add-course"
                        aria-expanded={isCourseFormOpen}
                        aria-controls="course-create-form"
                        onClick={() => setIsCourseFormOpen(true)}
                    >
                        + Add Course
                    </button>
                ) : null}
            </header>

            {isCourseFormOpen ? (
                <form id="course-create-form" className="courses-form" onSubmit={handleSubmit}>
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
                        <div className="courses-form__actions">
                            <button
                                type="button"
                                className="courses-form__cancel"
                                onClick={() => closeCourseForm({ clearDraft: true })}
                            >
                                Cancel
                            </button>
                            <button type="submit">Create Course</button>
                        </div>
                    </div>
                    {formError ? <p className="courses-form__error">{formError}</p> : null}
                </form>
            ) : null}

            {generationProgress ? (
                <section
                    className={`courses-progress courses-progress--${generationProgress.state}`}
                    aria-live="polite"
                >
                    <div className="courses-progress__header">
                        <div>
                            <p className="courses-page__eyebrow">{getGenerationLabel(generationProgress.scopeType)}</p>
                            <h2 className="courses-progress__title">
                                {generationProgress.scopeTitle || 'Generating reports'}
                            </h2>
                        </div>
                        {generationProgress.state === 'running' ? (
                            <button
                                type="button"
                                className="courses-progress__stop"
                                onClick={onCancelGeneration}
                            >
                                Stop
                            </button>
                        ) : null}
                    </div>
                    <div className="courses-progress__meter">
                        <div
                            className="courses-progress__track"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={generationProgress.totalTopics}
                            aria-valuenow={Math.min(generationProgress.totalTopics, progressValue)}
                            aria-valuetext={`${generationProgress.completedTopics} of ${generationProgress.totalTopics} topics complete`}
                        >
                            <div
                                className="courses-progress__fill"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="courses-progress__count">
                            {generationProgress.completedTopics}/{generationProgress.totalTopics}
                        </span>
                    </div>
                    <p className="courses-progress__status">{generationProgress.currentStatus}</p>
                    {generationProgress.currentTopic ? (
                        <p className="courses-progress__detail">
                            Current topic: <strong>{generationProgress.currentTopic}</strong>
                            {generationProgress.state === 'running'
                                ? ` (${generationProgress.currentIndex} of ${generationProgress.totalTopics})`
                                : ''}
                        </p>
                    ) : null}
                    {generationProgress.errorMessage ? (
                        <p className="courses-progress__error">{generationProgress.errorMessage}</p>
                    ) : null}
                </section>
            ) : null}

            {hasCourses ? (
                <div className="courses-tree" aria-label="Course List">
                    {courses.map((course) => {
                        const courseTopics = course.modules.flatMap((module) => module.topics);
                        const completedCourseTopics = courseTopics.filter((topic) => topic.completed).length;
                        return (
                            <details key={course.id} className="courses-tree__course" open>
                                <summary className="courses-tree__summary">
                                    <div className="courses-tree__summary-main">
                                        <span>{course.title}</span>
                                        <button
                                            type="button"
                                            className="courses-tree__report-action"
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                onGenerateCourseReports(course.title, course.modules);
                                            }}
                                            disabled={isRunning || courseTopics.length === 0}
                                        >
                                            Generate
                                        </button>
                                    </div>
                                    <div className="courses-tree__summary-right">
                                        <span>
                                            {course.modules.filter((module) => module.completed).length}/{course.modules.length} Modules
                                        </span>
                                        <span>
                                            {completedCourseTopics}/{courseTopics.length} Topics
                                        </span>
                                        {moduleEditorCourseId !== course.id ? (
                                            <button
                                                type="button"
                                                className="courses-tree__add"
                                                onClick={(event) => handleOpenModuleEditor(event, course.id)}
                                                aria-label={`Add module to ${course.title}`}
                                            >
                                                <PlusIcon />
                                            </button>
                                        ) : null}
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
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </summary>
                                <ul className="courses-tree__modules">
                                    {course.modules.map((module) => {
                                        const completedModuleTopics = module.topics.filter((topic) => topic.completed).length;

                                        return (
                                            <li key={module.id}>
                                                <details className="courses-tree__module" open>
                                                    <summary className="courses-tree__module-summary">
                                                        <div className="courses-tree__summary-main">
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
                                                            <button
                                                                type="button"
                                                                className="courses-tree__report-action courses-tree__report-action--inline"
                                                                onClick={(event) => {
                                                                    event.preventDefault();
                                                                    event.stopPropagation();
                                                                    onGenerateModuleReports(module.title, module.topics);
                                                                }}
                                                                disabled={isRunning || module.topics.length === 0}
                                                            >
                                                                Generate
                                                            </button>
                                                        </div>
                                                        <div className="courses-tree__module-actions">
                                                            <span className="courses-tree__topic-count">
                                                                {completedModuleTopics}/{module.topics.length} Topics
                                                            </span>
                                                            {topicEditorModuleId !== module.id ? (
                                                                <button
                                                                    type="button"
                                                                    className="courses-tree__add"
                                                                    onClick={(event) => handleOpenTopicEditor(event, module.id)}
                                                                    aria-label={`Add topic to ${module.title}`}
                                                                >
                                                                    <PlusIcon />
                                                                </button>
                                                            ) : null}
                                                            <button
                                                                type="button"
                                                                className="courses-tree__delete courses-tree__delete--inline"
                                                                onClick={(event) => {
                                                                    event.preventDefault();
                                                                    event.stopPropagation();
                                                                    if (topicEditorModuleId === module.id) {
                                                                        setTopicEditorModuleId(null);
                                                                        setTopicDraft('');
                                                                        setTopicError('');
                                                                    }
                                                                    onDeleteModule(course.id, module.id);
                                                                }}
                                                                aria-label={`Delete module ${module.title}`}
                                                            >
                                                                <TrashIcon />
                                                            </button>
                                                        </div>
                                                    </summary>

                                                    {module.topics.length > 0 ? (
                                                        <ul className="courses-tree__topics">
                                                            {module.topics.map((topic) => (
                                                                <li key={topic.id}>
                                                                    <div className="courses-tree__topic-row">
                                                                        <div className="courses-tree__topic-main">
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
                                                                            <button
                                                                                type="button"
                                                                                className="courses-tree__report-action courses-tree__report-action--inline"
                                                                                onClick={() => onGenerateTopicReport(topic.title)}
                                                                                disabled={isRunning}
                                                                            >
                                                                                Generate
                                                                            </button>
                                                                        </div>
                                                                        <div className="courses-tree__topic-actions">
                                                                            <button
                                                                                type="button"
                                                                                className="courses-tree__delete courses-tree__delete--inline"
                                                                                onClick={() => onDeleteTopic(course.id, module.id, topic.id)}
                                                                                aria-label={`Delete topic ${topic.title}`}
                                                                            >
                                                                                <TrashIcon />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="courses-tree__empty">No Topics in This Module.</p>
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
                                        );
                                    })}
                                </ul>
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
                            </details>
                        );
                    })}
                </div>
            ) : (
                <p className="courses-empty">No courses yet.</p>
            )}
        </section>
    );
}
