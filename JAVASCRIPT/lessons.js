const lessonMap = {
            alphabetCard: {
                href: 'alphabet.html',
                title: 'Continue to Alphabet Lesson?',
                msg: 'Are you sure you want to proceed to the Alphabet lesson?'
            },
            numbersCard: {
                href: 'numbers.html',
                title: 'Continue to Numbers Lesson?',
                msg: 'Are you sure you want to proceed to the Numbers lesson?'
            },
            greetingsCard: {
                href: 'greetings.html',
                title: 'Continue to Greetings Lesson?',
                msg: 'Are you sure you want to proceed to the Greetings lesson?'
            },
            emotionsCard: {
                href: 'emotions.html',
                title: 'Continue to Emotions Lesson?',
                msg: 'Are you sure you want to proceed to the Emotions lesson?'
            },
            colorsCard: {
                href: 'colors.html',
                title: 'Continue to Colors Lesson?',
                msg: 'Are you sure you want to proceed to the Colors lesson?'
            }
        };

        let selectedLessonHref = '';
        Object.keys(lessonMap).forEach(cardId => {
            document.getElementById(cardId).addEventListener('click', function () {
                selectedLessonHref = lessonMap[cardId].href;
                document.getElementById('modalTitle').textContent = lessonMap[cardId].title;
                document.getElementById('modalMessage').textContent = lessonMap[cardId].msg;
                document.getElementById('confirmModal').style.display = 'flex';
            });
        });

        document.getElementById('modalContinueBtn').addEventListener('click', function () {
            window.location.href = selectedLessonHref;
        });

        document.getElementById('modalCancelBtn').addEventListener('click', function () {
            document.getElementById('confirmModal').style.display = 'none';
            selectedLessonHref = '';
        });

        document.getElementById('confirmModal').addEventListener('click', function (e) {
            if (e.target === this) {
                this.style.display = 'none';
                selectedLessonHref = '';
            }
        });