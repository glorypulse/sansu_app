(function (root) {
    const createAnswerGuard = () => {
        let locked = false;

        return {
            submit: ({ feedback, hasAnswer, isCorrect }) => {
                if (locked || feedback === 'correct' || !hasAnswer) return null;
                if (!isCorrect) return 'incorrect';

                locked = true;
                return 'correct';
            },
            reset: () => {
                locked = false;
            }
        };
    };

    const api = { createAnswerGuard };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.Make10MasterLogic = api;
})(globalThis);
