// Button handlers
    const statButtons = document.querySelectorAll('.stat-button');

    statButtons.forEach(button => {
        button.addEventListener('click', function () {
            const statId = this.dataset.statId;
            const statLabel = this.querySelector('.stat-label').textContent;

            loadStatistic(statId, statLabel);
        });
    })


function loadStatistic(statId, statLabel) {
    window.location.href = `/statistics/result?stat_id=${statId}&title=${encodeURIComponent(statLabel)}`;
}
