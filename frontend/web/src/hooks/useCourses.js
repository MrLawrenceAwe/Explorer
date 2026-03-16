import { useCallback, useEffect, useState } from 'react';
import { COURSES_STORAGE_KEY } from '../utils/constants';
import { loadSavedList, persistList } from '../utils/storage';
import {
    addCourse as addCourseEntry,
    addModuleToCourse as addModuleToCourseEntry,
    addTopicsToModule,
    deleteCourse as deleteCourseEntry,
    deleteModuleFromCourse as deleteModuleEntry,
    deleteTopicFromModule as deleteTopicEntry,
    normalizeCourses,
    toggleModuleCompletion,
    toggleTopicCompletion,
} from '../utils/courseData';

export function useCourses() {
    const [courses, setCourses] = useState(() => normalizeCourses(loadSavedList(COURSES_STORAGE_KEY)));

    useEffect(() => {
        persistList(COURSES_STORAGE_KEY, courses);
    }, [courses]);

    const addCourse = useCallback(({ title, modules }) => {
        let changed = false;
        setCourses((current) => {
            const result = addCourseEntry(current, { title, modules });
            changed = result.changed;
            return result.courses;
        });
        return changed;
    }, []);

    const deleteCourse = useCallback((courseId) => {
        setCourses((current) => deleteCourseEntry(current, courseId).courses);
    }, []);

    const toggleModule = useCallback((courseId, moduleId, completed) => {
        setCourses((current) => toggleModuleCompletion(current, courseId, moduleId, completed).courses);
    }, []);

    const toggleTopic = useCallback((courseId, moduleId, topicId, completed) => {
        setCourses((current) => toggleTopicCompletion(current, courseId, moduleId, topicId, completed).courses);
    }, []);

    const addTopicToModule = useCallback((courseId, moduleId, topics) => {
        let changed = false;
        setCourses((current) => {
            const result = addTopicsToModule(current, courseId, moduleId, topics);
            changed = result.changed;
            return result.courses;
        });
        return changed;
    }, []);

    const addModuleToCourse = useCallback((courseId, module) => {
        let changed = false;
        setCourses((current) => {
            const result = addModuleToCourseEntry(current, courseId, module);
            changed = result.changed;
            return result.courses;
        });
        return changed;
    }, []);

    const deleteModuleFromCourse = useCallback((courseId, moduleId) => {
        setCourses((current) => deleteModuleEntry(current, courseId, moduleId).courses);
    }, []);

    const deleteTopicFromModule = useCallback((courseId, moduleId, topicId) => {
        setCourses((current) => deleteTopicEntry(current, courseId, moduleId, topicId).courses);
    }, []);

    return {
        courses,
        addCourse,
        deleteCourse,
        toggleModule,
        toggleTopic,
        addTopicToModule,
        addModuleToCourse,
        deleteModuleFromCourse,
        deleteTopicFromModule,
    };
}
