let empleados = [];
let currentIndex = 0;

function loadEmployees() {
  fetch('/public/empleados')
    .then(res => res.json())
    .then(data => {
      empleados = data;
      if (empleados.length > 0) {
        showEmployee(0);
      }
    });
}

function showEmployee(idx) {
  const emp = empleados[idx];
  if (!emp) return;
  document.getElementById('employee-name').textContent = `${emp.nombre} ${emp.apellidos}`;
  document.getElementById('employee-label').textContent = `${emp.nombre} ${emp.apellidos}`;
  document.querySelectorAll('input[name="task1"]').forEach(el => (el.checked = false));
}

document.querySelector('.btn-next').addEventListener('click', () => {
  if (currentIndex < empleados.length - 1) {
    currentIndex++;
    showEmployee(currentIndex);
  } else {
    window.location.href = '/';
  }
});

document.querySelector('.btn-prev').addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    showEmployee(currentIndex);
  }
});

window.addEventListener('load', loadEmployees);
