export class Pagination {
    constructor({ container, perPage = 6, onPageChange }) {
        this.container = container; this.perPage = perPage; this.onPageChange = onPageChange;
        this.currentPage = 1; this.totalItems = 0;
    }
    setTotal(total) { this.totalItems = total; this.currentPage = 1; this.render(); }
    get totalPages() { return Math.max(1, Math.ceil(this.totalItems / this.perPage)); }
    getOffset() { return (this.currentPage - 1) * this.perPage; }
    goTo(page) { if (page < 1 || page > this.totalPages || page === this.currentPage) return; this.currentPage = page; this.render(); this.onPageChange(this.currentPage); }
    render() {
        const total = this.totalPages;
        if (total <= 1) { this.container.innerHTML = ''; return; }
        let html = `<button class="page-btn" data-page="prev" ${this.currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
        for (let i = 1; i <= total; i++) {
            html += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        html += `<button class="page-btn" data-page="next" ${this.currentPage === total ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
        this.container.innerHTML = html;
        this.container.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.dataset.page;
                if (val === 'prev') this.goTo(this.currentPage - 1);
                else if (val === 'next') this.goTo(this.currentPage + 1);
                else this.goTo(Number(val));
            });
        });
    }
}