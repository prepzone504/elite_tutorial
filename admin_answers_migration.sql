-- Add 'answers' column to store the user's selected options for later review
ALTER TABLE public.user_exam_attempts
ADD COLUMN IF NOT EXISTS answers JSONB;

do a todolist. once the user finished the Elite puzzle exam he or she cannot enter the exam again(exam is one time exam),and  is like the question is in a loop, once the user finished the set of questions or time elapse the puzzle end. once the user finished they can only review the exam