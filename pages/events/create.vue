<template>
  <div class="event-create-page">
    <h1>Создать мероприятие</h1>

    <form @submit.prevent="createEvent" class="event-form">
      <!-- Название -->
      <div class="form-field">
        <label for="title">Название:</label>
        <input type="text" id="title" v-model="formData.title" required />
      </div>

      <!-- Тип мероприятия -->
      <div class="form-field">
        <label for="type">Тип:</label>
        <select id="type" v-model="formData.type" required>
          <option v-for="option in eventTypes" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- Участники (если индивидуальная встреча) -->
      <div class="form-field" v-if="formData.type === 'meeting_individual'">
        <label for="participants">Участники встречи:</label>
        <select id="participants" multiple v-model="formData.participants">
          <option v-for="user in users" :key="user.id" :value="user.id">
            {{ user.full_name }}
          </option>
        </select>
        <small>Зажмите Ctrl (или ⌘ на Mac), чтобы выбрать нескольких сотрудников</small>
      </div>

      <!-- Выбор отдела (если встреча по отделу) -->
      <div class="form-field" v-if="formData.type === 'meeting_department'">
        <label for="department">Выберите отдел:</label>
        <select id="department" v-model="formData.department_id" required>
          <option v-for="dept in departments" :key="dept.id" :value="dept.id">
            {{ dept.name }}
          </option>
        </select>
      </div>

      <!-- Остальные поля -->
      <div class="form-field">
        <label for="event_date">Дата:</label>
        <input type="datetime-local" id="event_date" v-model="formData.event_date" required />
      </div>

      <div class="form-field">
        <label for="description">Описание:</label>
        <textarea id="description" v-model="formData.description"></textarea>
      </div>

      <div class="form-field">
        <label for="location">Место:</label>
        <input type="text" id="location" v-model="formData.location" />
      </div>

      <div class="form-field">
        <label for="location_comment">Комментарий к месту:</label>
        <input type="text" id="location_comment" v-model="formData.location_comment" />
      </div>

      <!-- Настройки уведомлений и новостей -->
      <div class="form-field" v-if="showCreateNewsOption">
        <label>Хотите сразу создать новость об этом мероприятии?</label>
        <select v-model="wantCreateNews">
          <option value="no">Нет</option>
          <option value="yes">Да</option>
        </select>
      </div>

      <div class="form-field" v-if="showNotifyUsersOption">
        <label>Оповестить всех сотрудников?</label>
        <select v-model="wantNotifyUsers">
          <option value="no">Нет</option>
          <option value="yes">Да</option>
        </select>
      </div>

      <button type="submit" class="submit-btn">Создать мероприятие</button>
    </form>

    <div v-if="message" :class="['message', message.type]">{{ message.text }}</div>
  </div>
</template>


<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFetch } from '#app'
import { useRouter } from 'vue-router'

interface User {
  id: number
  full_name: string
}
interface Department {
  id: number
  name: string
}
interface CreateEventResponse {
  status: 'success' | 'error'
  message?: string
  eventId?: number
}

const router = useRouter()

const eventTypes = [
  { value: 'meeting_individual', label: 'Встреча с конкретным(и) сотрудником(ами)' },
  { value: 'meeting_department', label: 'Встреча с сотрудниками отдела' },
  { value: 'teambuilding', label: 'Тимбилдинг' },
  { value: 'training', label: 'Обучение / Воркшопы' },
  { value: 'corporate', label: 'Корпоративный праздник' },
  { value: 'presentation', label: 'Презентация проекта / Конференция' }
]

const majorTypes = ['corporate', 'presentation', 'teambuilding']

const formData = ref({
  title: '',
  type: 'meeting_individual',
  event_date: '',
  description: '',
  location: '',
  location_comment: '',
  participants: [] as number[],
  department_id: null as number | null
})

const users = ref<User[]>([])
const departments = ref<Department[]>([])
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const wantCreateNews = ref<'yes' | 'no'>('no')
const wantNotifyUsers = ref<'yes' | 'no'>('no')

const showCreateNewsOption = computed(() =>
  majorTypes.includes(formData.value.type)
)

const showNotifyUsersOption = computed(() =>
  !['meeting_individual', 'meeting_department'].includes(formData.value.type)
)

const showDepartmentSelect = computed(() =>
  formData.value.type === 'meeting_department'
)

onMounted(async () => {
  const token = localStorage.getItem('authToken')
  if (!token) return

  try {
    const [userRes, deptRes] = await Promise.all([
      useFetch<{ users: User[] } | User[]>('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      useFetch<{ departments: Department[] } | Department[]>('/api/departments', {
        headers: { Authorization: `Bearer ${token}` }
      })
    ])

    const rawUsers = userRes.data.value
    users.value = Array.isArray(rawUsers)
      ? rawUsers
      : (rawUsers?.users || [])

    const rawDepartments = deptRes.data.value
    departments.value = Array.isArray(rawDepartments)
      ? rawDepartments
      : (rawDepartments?.departments || [])

    console.log('users:', users.value)
    console.log('departments:', departments.value)
  } catch (err: any) {
    console.error('Ошибка загрузки данных:', err.message)
    message.value = { type: 'error', text: 'Ошибка загрузки данных' }
  }
})



async function createEvent() {
  try {
    message.value = null
    const token = localStorage.getItem('authToken')
    if (!token) throw new Error('Вы не авторизованы')

    const payload = {
      ...formData.value,
      notifyAll: showNotifyUsersOption.value && wantNotifyUsers.value === 'yes'
    }

    const { data, error } = await useFetch<CreateEventResponse>('/api/events', {
      method: 'POST',
      body: payload,
      headers: { Authorization: `Bearer ${token}` }
    })

    if (error.value) {
      throw new Error(error.value.data?.message || 'Ошибка создания мероприятия')
    }

    if (!data.value || data.value.status !== 'success') {
      throw new Error(data.value?.message || 'Неизвестная ошибка')
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const redirectTo = user.role === 'admin' ? '/admin-dashboard' : '/manager-dashboard'

    if (showCreateNewsOption.value && wantCreateNews.value === 'yes') {
      router.push('/news/create')
    } else {
      router.push(redirectTo)
    }
  } catch (err: any) {
    message.value = { type: 'error', text: err.message }
  }
}

</script>






<style scoped>
.event-create-page {
  max-width: 640px;
  margin: 100px auto;
  padding: 30px;
  background-color: #ffffff;
  border-left: 6px solid #ff9800;
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  font-family: 'Segoe UI', sans-serif;
  color: #111;
}

h1 {
  font-size: 26px;
  color: #222;
  margin-bottom: 20px;
}

.event-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-weight: 600;
  color: #444;
}

input,
select,
textarea {
  padding: 10px 12px;
  border: 1px solid #bbb;
  border-radius: 6px;
  font-size: 15px;
  background-color: #f9f9f9;
  color: #222;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #ff9800;
  background-color: #fff;
}

select[multiple] {
  height: 140px;
  overflow-y: auto;
}

small {
  font-size: 12px;
  color: #777;
}

.submit-btn {
  background-color: #ff9800;
  color: #fff;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.submit-btn:hover {
  background-color: #fb8c00;
}

.message {
  margin-top: 20px;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
}

.message.success {
  background-color: #e0f2f1;
  color: #00695c;
}

.message.error {
  background-color: #ffebee;
  color: #c62828;
}
</style>
