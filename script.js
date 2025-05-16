document.addEventListener('DOMContentLoaded', function() {
    const questionsContainer = document.getElementById('questions-container');
    const progressText = document.querySelector('.progress');
    
    let originalQuestions = [];
    let shuffledQuestions = [];
    let currentQuestion = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let totalQuestions = 0;
    let failureThreshold = 0;

    // Función para mezclar array usando Fisher-Yates
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    async function loadQuestions() {
        try {
            const response = await fetch('cl.txt');
            if (!response.ok) throw new Error('Error cargando el archivo');
            const text = await response.text();
            
            const cleanedText = text.replace(/\r/g, '').replace(/\n+/g, '\n');
            originalQuestions = parseQuestions(cleanedText);
            totalQuestions = originalQuestions.length;
            failureThreshold = Math.ceil(totalQuestions * 0.4);
            
            if (totalQuestions === 0) {
                progressText.textContent = 'No se encontraron preguntas';
                return;
            }
            
            // Mezclar preguntas y crear copia
            shuffledQuestions = shuffleArray([...originalQuestions]);
            showQuestion(currentQuestion);
            progressText.textContent = `Pregunta ${currentQuestion + 1} de ${totalQuestions}`;
            
        } catch (error) {
            console.error('Error:', error);
            progressText.textContent = 'Error al cargar las preguntas';
            questionsContainer.innerHTML = `
                <div class="error">
                    Error cargando preguntas: ${error.message}
                    <br>Verifica que:
                    <ul>
                        <li>El archivo cl.txt existe</li>
                        <li>Estás usando un servidor local</li>
                        <li>El formato del archivo es correcto</li>
                    </ul>
                </div>
            `;
        }
    }

    function parseQuestions(text) {
        const questionBlocks = text.split(/Pregunta:\s*/i).slice(1);
        
        return questionBlocks.map(block => {
            const lines = block.split('\n').filter(line => line.trim() !== '');
            const question = {
                questionText: '',
                options: [],
                correctAnswer: ''
            };

            lines.forEach(line => {
                if (line.startsWith('Respuesta Correcta:')) {
                    question.correctAnswer = line.split(':')[1].trim();
                } else if (/^Respuesta \d+:/.test(line)) {
                    const option = line.split(':').slice(1).join(':').trim();
                    question.options.push(option);
                } else if (question.questionText === '') {
                    question.questionText = line.trim();
                }
            });

            return question;
        }).filter(q => q.questionText && q.options.length > 0 && q.correctAnswer);
    }

    function showQuestion(index) {
        if (index === 0) {
            // Re-mezclar preguntas al reiniciar
            shuffledQuestions = shuffleArray([...originalQuestions]);
            correctCount = 0;
            incorrectCount = 0;
            updateStats();
        }
        
        if (!shuffledQuestions[index]) {
            questionsContainer.innerHTML = '<p>No hay más preguntas</p>';
            return;
        }

        const question = shuffledQuestions[index];
        let optionsHTML = '';
        
        // Mezclar opciones de respuesta
        const shuffledOptions = shuffleArray([...question.options]);
        
        shuffledOptions.forEach((option, i) => {
            const isCorrect = option === question.correctAnswer;
            const letter = String.fromCharCode(65 + i);
            
            optionsHTML += `
                <div class="option-card" data-correct="${isCorrect}">
                    ${letter}. ${option}
                </div>
            `;
        });

        questionsContainer.innerHTML = `
            <div class="question-container">
                <div class="question-text">${question.questionText}</div>
                <div class="options-container">${optionsHTML}</div>
                <button class="next-btn">
                    ${index < totalQuestions - 1 ? 'Siguiente' : 'Finalizar'}
                </button>
            </div>
        `;

        setupEventListeners();
    }

    function updateStats() {
        document.getElementById('correct-count').textContent = correctCount;
        document.getElementById('incorrect-count').textContent = incorrectCount;
    }

    function checkFailure() {
        if (incorrectCount >= failureThreshold) {
            questionsContainer.innerHTML = `
                <div class="fail-message">
                    <h2>¡Has desaprobado el examen!</h2>
                    <p>Has respondido incorrectamente ${incorrectCount} de ${totalQuestions} preguntas (${Math.round((incorrectCount/totalQuestions)*100)}%).</p>
                    <button onclick="location.reload()">Reintentar</button>
                </div>
            `;
            progressText.textContent = 'Examen desaprobado';
            return true;
        }
        return false;
    }

    function setupEventListeners() {
        const optionCards = document.querySelectorAll('.option-card');
        const nextButton = document.querySelector('.next-btn');
        
        optionCards.forEach(card => {
            card.addEventListener('click', function() {
                if (this.classList.contains('correct') || this.classList.contains('incorrect')) {
                    return;
                }
                
                const isCorrect = this.dataset.correct === 'true';
                
                if (isCorrect) {
                    correctCount++;
                } else {
                    incorrectCount++;
                }
                updateStats();
                
                if (checkFailure()) return;

                if (isCorrect) {
                    this.classList.add('correct');
                } else {
                    this.classList.add('incorrect');
                    const correctCard = [...optionCards].find(
                        card => card.dataset.correct === 'true'
                    );
                    correctCard.classList.add('correct');
                }
                
                optionCards.forEach(card => {
                    card.style.pointerEvents = 'none';
                });
            });
        });

        nextButton.addEventListener('click', () => {
            if (correctCount + incorrectCount !== currentQuestion + 1) return;
            
            currentQuestion++;
            
            if (currentQuestion < totalQuestions) {
                showQuestion(currentQuestion);
                progressText.textContent = `Pregunta ${currentQuestion + 1} de ${totalQuestions}`;
            } else {
                const finalMessage = incorrectCount >= failureThreshold 
                    ? '¡Has desaprobado el examen!' 
                    : '¡Cuestionario completado y aprobado!';
                
                alert(`${finalMessage}\nCorrectas: ${correctCount}\nIncorrectas: ${incorrectCount}`);
                currentQuestion = 0;
                showQuestion(currentQuestion);
            }
        });
    }

    loadQuestions();
});