import { create } from 'zustand'

const useChartStore = create((set) => ({
    conversationId: '',
    model: 'deepseek',
    streamStream: true,

    setConversationId: (conversationId) => set({ conversationId }),
    setModel: (model) => set({ model }),
    setStreamStream: (streamStream) => set({ streamStream }),

    toggleModel: () => set((state) => ({
        model: state.model == 'deepseek' ? 'agnes' : 'deepseek',
    })),
    toggleStreamStream: () => set((state) => ({
        streamStream: !state.streamStream,
    })),
    resetConversation: () => set({ conversationId: '' })
}))

export default useChartStore;