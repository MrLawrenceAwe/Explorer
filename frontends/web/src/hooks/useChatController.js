import { useCallback } from 'react';
import { useChat } from './useChat';
import { useBeforeUnloadWarning } from './useBeforeUnloadWarning';

export function useChatController({ apiBase, rememberReport, forgetReport, setIsHomeView }) {
    const chat = useChat(apiBase, rememberReport);

    useBeforeUnloadWarning(chat.isRunning);

    const handleForgetReport = useCallback(
        async (id) => {
            const reportToDelete = await forgetReport(id);
            if (!reportToDelete || chat.isRunning) return;

            const assistantMsg = findLatestAssistantReportMessage(chat.messages);
            if (assistantMsg && assistantMsg.reportTopic === reportToDelete.topic) {
                chat.setMessages([]);
                setIsHomeView(true);
            }
        },
        [forgetReport, chat.isRunning, chat.messages, chat.setMessages, setIsHomeView]
    );

    return {
        ...chat,
        handleForgetReport,
    };
}

function findLatestAssistantReportMessage(messages) {
    return [...messages].reverse().find((message) => message.role === 'assistant' && message.reportTopic);
}
