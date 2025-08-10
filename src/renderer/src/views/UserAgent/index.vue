<template>
  <div class="user-agent">
    <!-- Tab切换 -->
    <div class="tab-section">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="助手维度" name="agent"></el-tab-pane>
        <el-tab-pane label="用户维度" name="user"></el-tab-pane>
      </el-tabs>
    </div>

    <!-- 搜索和筛选区域 -->
    <div class="search-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input v-model="searchKeyword" :placeholder="activeTab === 'agent' ? '搜索助手' : '搜索账号'" clearable
            @input="handleSearch">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="16"></el-col>
        <el-col :span="2">
          <el-button type="primary" :icon="Refresh" @click="loadData" style="width: 100%;min-width: 110px;">
            刷新列表
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 助手维度列表表格 -->
    <div v-if="activeTab === 'agent'" class="table-section">
      <el-table ref="agentTableRef" class="custom-table" stripe :data="agents" :height="maxHeight" style="width: 100%;" v-loading="loading">
        <el-table-column prop="name" label="助手名称" min-width="100" show-overflow-tooltip></el-table-column>
        <el-table-column prop="desc" label="描述" min-width="300" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button text type="primary" size="small" :icon="User" @click="handleAssignUsers(row)" style="margin-left: -15px;">
                分配
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 用户维度列表表格 -->
    <div v-if="activeTab === 'user'" class="table-section">
      <el-table ref="userTableRef" class="custom-table" stripe :data="users" :height="maxHeight" style="width: 100%;" v-loading="loading">
        <el-table-column prop="user_id" label="账号" min-width="200" show-overflow-tooltip></el-table-column>
        <el-table-column prop="user_name" label="姓名" min-width="200" show-overflow-tooltip></el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="200" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="left" header-align="left">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button text type="primary" size="small" :icon="User" @click="handleAssignAgents(row)" style="margin-left: -15px;">
                分配
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-section">
      <el-pagination background v-model:current-page="currentPage" v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" :total="total"
        @size-change="handleSizeChange" @current-change="handleCurrentChange" />
    </div>

    <!-- 助手分配人员对话框 -->
    <el-dialog v-model="assignUserDialogVisible" title="分配人员" width="900px" :before-close="handleCloseAssignDialog">
      <div class="assign-dialog-content">
        <div class="agent-info">
          <h4>{{ currentAgent?.name }}</h4>
          <p>{{ currentAgent?.desc }}</p>
        </div>

        <div class="transfer-container">
          <div class="transfer-panel">
            <div class="panel-header">
              <span class="panel-title">可分配人员 ({{ filteredUsers.length }})</span>
            </div>
            <div class="panel-content">
              <div class="search-container">
                <el-input v-model="userSearchKeyword" placeholder="搜索人员" size="small" clearable
                  @input="handleUserSearch">
                  <template #prefix>
                    <el-icon>
                      <Search />
                    </el-icon>
                  </template>
                </el-input>
              </div>
              <el-checkbox v-model="allUsersSelected" :indeterminate="isIndeterminate" @change="handleSelectAll"
                class="select-all-checkbox">
                全选
              </el-checkbox>
              <el-scrollbar height="300px" class="user-list">
                <div class="virtual-list">
                  <el-checkbox-group v-model="selectedUserKeys" @change="handleUserSelection">
                    <div v-for="user in visibleUsers" :key="user.user_id" class="user-item">
                      <el-checkbox :value="user.user_id" :disabled="user.disabled">
                        <span>{{ user.user_name }}</span>
                        <span style="font-size: 12px; color: #8e9aaf; margin-left: 8px;">{{ user.email }}</span>
                        <span style="font-size: 12px; color: #8e9aaf; margin-left: 8px;">{{ user.department }}</span>
                      </el-checkbox>
                    </div>
                  </el-checkbox-group>
                </div>
                <div v-if="hasMoreUsers" class="load-more">
                  <el-button text @click="loadMoreUsers" :loading="loadingMoreUsers">
                    加载更多 ({{ remainingUsersCount }}条)
                  </el-button>
                </div>
              </el-scrollbar>
            </div>
          </div>

          <div class="transfer-buttons">
            <el-button type="primary" :icon="ArrowRight" :disabled="selectedUserKeys.length === 0" @click="handleTransferToAssigned">
            </el-button>
            <el-button :icon="ArrowLeft" :disabled="assignedUsers.length === 0" @click="handleRemoveFromAssigned">
            </el-button>
          </div>

          <div class="transfer-panel">
            <div class="panel-header">
              <span class="panel-title">已分配人员 ({{ assignedUsers.length }})</span>
            </div>
            <div class="panel-content">
              <div class="search-container">
                <el-input v-model="assignedUserSearchKeyword" placeholder="搜索人员" size="small" clearable
                  @input="handleAssignedUserSearch">
                  <template #prefix>
                    <el-icon>
                      <Search />
                    </el-icon>
                  </template>
                </el-input>
              </div>
              <el-checkbox v-model="allAssignedUsersSelected" :indeterminate="isAssignedIndeterminate" @change="handleAssignedSelectAll"
                class="select-all-checkbox">
                全选
              </el-checkbox>
              <el-scrollbar height="300px" class="user-list">
                <div class="virtual-list">
                  <el-checkbox-group v-model="selectedAssignedKeys" @change="updateAssignedSelectAllStatus">
                    <div v-for="userId in filteredAssignedUsers" :key="userId" class="user-item">
                      <el-checkbox :value="userId">
                        <span>{{ getUserById(userId)?.user_name }}</span>
                        <span style="font-size: 12px; color: #8e9aaf; margin-left: 8px;">{{ getUserById(userId)?.email }}</span>
                        <span style="font-size: 12px; color: #8e9aaf; margin-left: 8px;">{{ getUserById(userId)?.department }}</span>
                      </el-checkbox>
                    </div>
                  </el-checkbox-group>
                </div>
              </el-scrollbar>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCloseAssignDialog">取消</el-button>
          <el-button type="primary" @click="handleConfirmAssignUsers" :loading="assignLoading">
            确定分配 ({{ assignedUsers.length }}人)
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 用户分配助手对话框 -->
    <el-dialog v-model="assignAgentDialogVisible" title="分配助手" width="900px"
      :before-close="handleCloseAssignAgentDialog">
      <div class="assign-dialog-content">
        <div class="user-info">
          <h4>{{ currentUser?.user_name }}</h4>
          <span>{{ currentUser?.email }}</span>
        </div>

        <div class="transfer-container">
          <div class="transfer-panel">
            <div class="panel-header">
              <span class="panel-title">可分配助手 ({{ filteredAgents.length }})</span>
            </div>
            <div class="panel-content">
              <div class="search-container">
                <el-input v-model="agentSearchKeyword" placeholder="搜索助手" size="small" clearable
                  @input="handleAgentSearch">
                  <template #prefix>
                    <el-icon>
                      <Search />
                    </el-icon>
                  </template>
                </el-input>
              </div>
              <el-checkbox v-model="allAgentsSelected" :indeterminate="isAgentIndeterminate"
                @change="handleSelectAllAgents" class="select-all-checkbox">
                全选
              </el-checkbox>
              <el-scrollbar height="300px" class="user-list">
                <div class="virtual-list">
                  <el-checkbox-group v-model="selectedAgentKeys" @change="handleAgentSelection">
                    <div v-for="agent in visibleAgents" :key="agent.id" class="user-item">
                      <el-checkbox :value="agent.id" :disabled="agent.disabled">
                        <span>{{ agent.name }}</span>
                        <span style="font-size: 12px; color: #8e9aaf; margin-left: 8px;">{{ agent.mode }}</span>
                      </el-checkbox>
                    </div>
                  </el-checkbox-group>
                </div>
                <div v-if="hasMoreAgents" class="load-more">
                  <el-button text @click="loadMoreAgents" :loading="loadingMoreAgents">
                    加载更多 ({{ remainingAgentsCount }}条)
                  </el-button>
                </div>
              </el-scrollbar>
            </div>
          </div>

          <div class="transfer-buttons">
            <el-button type="primary" :icon="ArrowRight" :disabled="selectedAgentKeys.length === 0"
              @click="handleTransferAgentsToAssigned">
            </el-button>
            <el-button :icon="ArrowLeft" :disabled="assignedAgents.length === 0" @click="handleRemoveAgentsFromAssigned">
            </el-button>
          </div>

          <div class="transfer-panel">
            <div class="panel-header">
              <span class="panel-title">已分配助手 ({{ assignedAgents.length }})</span>
            </div>
            <div class="panel-content">
              <div class="search-container">
                <el-input v-model="assignedAgentSearchKeyword" placeholder="搜索助手" size="small" clearable
                  @input="handleAssignedAgentSearch">
                  <template #prefix>
                    <el-icon>
                      <Search />
                    </el-icon>
                  </template>
                </el-input>
              </div>
              <el-checkbox v-model="allAssignedAgentsSelected" :indeterminate="isAssignedAgentIndeterminate" @change="handleAssignedAgentSelectAll"
                class="select-all-checkbox">
                全选
              </el-checkbox>
              <el-scrollbar height="300px" class="user-list">
                <div class="virtual-list">
                  <el-checkbox-group v-model="selectedAssignedAgentKeys" @change="updateAssignedAgentSelectAllStatus">
                    <div v-for="agentId in filteredAssignedAgents" :key="agentId" class="user-item">
                      <el-checkbox :value="agentId">
                        <span>{{ getAgentById(agentId)?.name }}</span>
                      </el-checkbox>
                    </div>
                  </el-checkbox-group>
                </div>
              </el-scrollbar>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCloseAssignAgentDialog">取消</el-button>
          <el-button type="primary" @click="handleConfirmAssignAgents" :loading="assignAgentLoading">
            确定分配 ({{ assignedAgents.length }}个助手)
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, User, ArrowRight, ArrowLeft } from '@element-plus/icons-vue'

// 假设这些API函数需要从api文件中导入，具体路径需要根据项目结构调整
// import { getAgentMap, getUserMap, getAgentUserMap, getUserAgentMap, setUserMap, setAgentMap } from '@/api/userAgent'

// 如果API函数已经全局注册或通过其他方式可用，可以忽略上面的导入

// 添加表格的ref引用
const agentTableRef = ref(null)
const userTableRef = ref(null)

// Tab相关
const activeTab = ref('agent')

// 响应式数据
const agents = ref([])
const users = ref([])
const loading = ref(false)
const assignUserDialogVisible = ref(false)
const assignAgentDialogVisible = ref(false)
const assignLoading = ref(false)
const assignAgentLoading = ref(false)
const currentAgent = ref(null)
const currentUser = ref(null)
const maxHeight = computed(() => {
  return window.innerHeight - 310
})

// 搜索和筛选
const searchKeyword = ref('')

// 分页数据
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 搜索防抖定时器
let searchTimer = null

// 人员分配相关数据
const allUsers = ref([])
const assignedUsers = ref([])
const selectedUserKeys = ref([])
const selectedAssignedKeys = ref([])
const userSearchKeyword = ref('')
const filteredUsers = ref([])
const visibleUsers = ref([])
const loadingMoreUsers = ref(false)
const currentUserPage = ref(1)
const userPageSize = 50 // 每次加载50个用户
let userSearchTimer = null

// 助手分配相关数据
const allAgents = ref([])
const assignedAgents = ref([])
const selectedAgentKeys = ref([])
const selectedAssignedAgentKeys = ref([])
const agentSearchKeyword = ref('')
const assignedUserSearchKeyword = ref('')
const assignedAgentSearchKeyword = ref('')
const filteredAgents = ref([])
const visibleAgents = ref([])
const loadingMoreAgents = ref(false)
const currentAgentPage = ref(1)
const agentPageSize = 50
let agentSearchTimer = null

// 全选相关
const allUsersSelected = ref(false)
const isIndeterminate = ref(false)
const allAgentsSelected = ref(false)
const isAgentIndeterminate = ref(false)
const allAssignedUsersSelected = ref(false)
const isAssignedIndeterminate = ref(false)
const allAssignedAgentsSelected = ref(false)
const isAssignedAgentIndeterminate = ref(false)

// 已分配数据缓存
const assignedUsersCache = ref([])
const assignedAgentsCache = ref([])

// 添加筛选后的已分配用户和助手列表
const filteredAssignedUsers = ref([])
const filteredAssignedAgents = ref([])

// 计算属性
const hasMoreUsers = computed(() => {
  return visibleUsers.value.length < filteredUsers.value.length
})

const remainingUsersCount = computed(() => {
  return filteredUsers.value.length - visibleUsers.value.length
})

const hasMoreAgents = computed(() => {
  return visibleAgents.value.length < filteredAgents.value.length
})

const remainingAgentsCount = computed(() => {
  return filteredAgents.value.length - visibleAgents.value.length
})

// 生命周期
onMounted(() => {
  loadData()
})

// Tab切换
const handleTabChange = (tabName) => {
  activeTab.value = tabName
  currentPage.value = 1
  searchKeyword.value = ''
  loadData()
}

// 统一加载数据方法
const loadData = () => {
  if (activeTab.value === 'agent') {
    loadAgents()
  } else {
    loadUsers()
  }
  // 添加滚动到顶部的逻辑
  setTimeout(() => {
    if (activeTab.value === 'agent' && agentTableRef.value) {
      agentTableRef.value.scrollTo(0, 0)
    } else if (activeTab.value === 'user' && userTableRef.value) {
      userTableRef.value.scrollTo(0, 0)
    }
  }, 100)
}

// 方法
const loadAgents = async () => {
  loading.value = true
  try {
    const params = {
      wd: searchKeyword.value,
      page: currentPage.value,
      limit: pageSize.value
    }

    const response = await getAgentMap(params)
    const data = response.data

    agents.value = data.agents || []
    total.value = data.total || 0
  } catch (error) {
    console.error('加载Agent列表失败:', error)
    ElMessage.error('加载助手列表失败')
  } finally {
    loading.value = false
  }
}

const loadUsers = async () => {
  loading.value = true
  try {
    const params = {
      wd: searchKeyword.value,
      page: currentPage.value,
      limit: pageSize.value
    }

    const response = await getUserMap(params)
    const data = response.data

    users.value = data.users || []
    total.value = data.total || 0
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

// 加载所有用户（用于分配）
const loadAllUsers = async () => {
  try {
    // 使用getUserMap获取特定角色的用户，而不是所有用户
    const response = await getUserMap({limit: 10000})
    allUsers.value = response.data.users || []
    return allUsers.value
  } catch (error) {
    console.error('加载用户数据失败:', error)
    ElMessage.error('加载用户数据失败')
    return []
  }
}

// 加载所有助手（用于分配）
const loadAllAgents = async () => {
  try {
    // 使用getAgentMap获取特定功能的助手，而不是所有助手
    const response = await getAgentMap({limit: 10000})
    allAgents.value = response.data.agents || []
    return allAgents.value
  } catch (error) {
    console.error('加载助手数据失败:', error)
    ElMessage.error('加载助手数据失败')
    return []
  }
}

// 初始化用户列表显示
const initializeUserList = () => {
  currentUserPage.value = 1
  const start = 0
  const end = userPageSize
  visibleUsers.value = filteredUsers.value.slice(start, end)
}

// 初始化助手列表显示
const initializeAgentList = () => {
  currentAgentPage.value = 1
  const start = 0
  const end = agentPageSize
  visibleAgents.value = filteredAgents.value.slice(start, end)
}

// 加载更多用户
const loadMoreUsers = () => {
  loadingMoreUsers.value = true
  
  setTimeout(() => {
    const start = visibleUsers.value.length
    const end = start + userPageSize
    const moreUsers = filteredUsers.value.slice(start, end)
    visibleUsers.value.push(...moreUsers)
    currentUserPage.value++
    loadingMoreUsers.value = false
  }, 300)
}

// 加载更多助手
const loadMoreAgents = () => {
  loadingMoreAgents.value = true
  
  setTimeout(() => {
    const start = visibleAgents.value.length
    const end = start + agentPageSize
    const moreAgents = filteredAgents.value.slice(start, end)
    visibleAgents.value.push(...moreAgents)
    currentAgentPage.value++
    loadingMoreAgents.value = false
  }, 300)
}

// 用户搜索
const handleUserSearch = () => {
  if (userSearchTimer) {
    clearTimeout(userSearchTimer)
  }
  
  userSearchTimer = setTimeout(() => {
    const keyword = userSearchKeyword.value.toLowerCase()
    if (keyword) {
      // 从所有可分配用户中搜索（已排除已分配的用户）
      filteredUsers.value = allUsers.value.filter(user => 
        !assignedUsers.value.includes(user.user_id) && (
          user.user_name.toLowerCase().includes(keyword) || 
          user.email.toLowerCase().includes(keyword)
        )
      )
    } else {
      // 重新过滤，排除已分配的用户
      filteredUsers.value = allUsers.value.filter(user => 
        !assignedUsers.value.includes(user.user_id)
      )
    }
    
    initializeUserList()
    updateSelectAllStatus()
  }, 300)
}

// 助手搜索
const handleAgentSearch = () => {
  if (agentSearchTimer) {
    clearTimeout(agentSearchTimer)
  }
  
  agentSearchTimer = setTimeout(() => {
    const keyword = agentSearchKeyword.value.toLowerCase()
    if (keyword) {
      // 从所有可分配助手中搜索（已排除已分配的助手）
      filteredAgents.value = allAgents.value.filter(agent => 
        !assignedAgents.value.includes(agent.id) && (
          agent.name.toLowerCase().includes(keyword) || 
          (agent.description && agent.description.toLowerCase().includes(keyword))
        )
      )
    } else {
      // 重新过滤，排除已分配的助手
      filteredAgents.value = allAgents.value.filter(agent => 
        !assignedAgents.value.includes(agent.id)
      )
    }
    
    initializeAgentList()
    updateAgentSelectAllStatus()
  }, 300)
}

// 处理用户选择
const handleUserSelection = () => {
  updateSelectAllStatus()
}

// 处理助手选择
const handleAgentSelection = () => {
  updateAgentSelectAllStatus()
}

// 更新用户全选状态
const updateSelectAllStatus = () => {
  const availableUsers = filteredUsers.value.filter(user => !user.disabled)
  const selectedAvailableUsers = selectedUserKeys.value.filter(key => 
    availableUsers.some(user => user.user_id === key)
  )
  
  if (selectedAvailableUsers.length === 0) {
    allUsersSelected.value = false
    isIndeterminate.value = false
  } else if (selectedAvailableUsers.length === availableUsers.length) {
    allUsersSelected.value = true
    isIndeterminate.value = false
  } else {
    allUsersSelected.value = false
    isIndeterminate.value = true
  }
}

// 更新助手全选状态
const updateAgentSelectAllStatus = () => {
  const availableAgents = filteredAgents.value.filter(agent => !agent.disabled)
  const selectedAvailableAgents = selectedAgentKeys.value.filter(key => 
    availableAgents.some(agent => agent.id === key)
  )
  
  if (selectedAvailableAgents.length === 0) {
    allAgentsSelected.value = false
    isAgentIndeterminate.value = false
  } else if (selectedAvailableAgents.length === availableAgents.length) {
    allAgentsSelected.value = true
    isAgentIndeterminate.value = false
  } else {
    allAgentsSelected.value = false
    isAgentIndeterminate.value = true
  }
}

// 处理用户全选
const handleSelectAll = (checked) => {
  if (checked) {
    const availableUsers = filteredUsers.value.filter(user => !user.disabled)
    const newSelectedKeys = [...new Set([...selectedUserKeys.value, ...availableUsers.map(user => user.user_id)])]
    selectedUserKeys.value = newSelectedKeys
  } else {
    const availableUserKeys = filteredUsers.value.map(user => user.user_id)
    selectedUserKeys.value = selectedUserKeys.value.filter(key => 
      !availableUserKeys.includes(key)
    )
  }
  updateSelectAllStatus()
}

// 处理助手全选
const handleSelectAllAgents = (checked) => {
  if (checked) {
    const availableAgents = filteredAgents.value.filter(agent => !agent.disabled)
    const newSelectedKeys = [...new Set([...selectedAgentKeys.value, ...availableAgents.map(agent => agent.id)])]
    selectedAgentKeys.value = newSelectedKeys
  } else {
    const availableAgentKeys = filteredAgents.value.map(agent => agent.id)
    selectedAgentKeys.value = selectedAgentKeys.value.filter(key => 
      !availableAgentKeys.includes(key)
    )
  }
  updateAgentSelectAllStatus()
}

// 转移用户到已分配
const handleTransferToAssigned = () => {
  if (selectedUserKeys.value.length === 0) return
  
  // 获取选中的用户对象
  const selectedUsers = allUsers.value.filter(user => 
    selectedUserKeys.value.includes(user.user_id)
  )
  
  // 将选中的用户ID添加到已分配列表
  assignedUsers.value = [...new Set([...assignedUsers.value, ...selectedUserKeys.value])]
  filteredAssignedUsers.value = [...assignedUsers.value] // 更新筛选后的列表
  
  // 将选中的用户对象添加到已分配缓存
  assignedUsersCache.value = [...assignedUsersCache.value, ...selectedUsers]
  
  // 从可分配列表中移除这些用户
  filteredUsers.value = filteredUsers.value.filter(user => 
    !selectedUserKeys.value.includes(user.user_id)
  )
  
  // 重新初始化可见用户列表
  initializeUserList()
  
  // 清空选中状态
  selectedUserKeys.value = []
  updateSelectAllStatus()
}

// 从已分配移除用户
const handleRemoveFromAssigned = () => {
  if (selectedAssignedKeys.value.length === 0) return
  
  // 获取选中的已分配用户对象
  const selectedUsers = assignedUsersCache.value.filter(user => 
    selectedAssignedKeys.value.includes(user.user_id)
  )
  
  // 从已分配列表移除
  assignedUsers.value = assignedUsers.value.filter(userId => 
    !selectedAssignedKeys.value.includes(userId)
  )
  filteredAssignedUsers.value = filteredAssignedUsers.value.filter(userId => 
    !selectedAssignedKeys.value.includes(userId)
  )
  
  // 从已分配缓存中移除
  assignedUsersCache.value = assignedUsersCache.value.filter(user => 
    !selectedAssignedKeys.value.includes(user.user_id)
  )
  
  // 将这些用户添加回可分配列表
  filteredUsers.value = [...filteredUsers.value, ...selectedUsers]
  
  // 重新初始化可见用户列表
  initializeUserList()
  
  // 清空选中状态
  selectedAssignedKeys.value = []
  updateAssignedSelectAllStatus()
}

// 转移助手到已分配
const handleTransferAgentsToAssigned = () => {
  if (selectedAgentKeys.value.length === 0) return
  
  // 获取选中的助手对象
  const selectedAgents = allAgents.value.filter(agent => 
    selectedAgentKeys.value.includes(agent.id)
  )
  
  // 将选中的助手ID添加到已分配列表
  assignedAgents.value = [...new Set([...assignedAgents.value, ...selectedAgentKeys.value])]
  filteredAssignedAgents.value = [...assignedAgents.value] // 更新筛选后的列表
  
  // 将选中的助手对象添加到已分配缓存
  assignedAgentsCache.value = [...assignedAgentsCache.value, ...selectedAgents]
  
  // 从可分配列表中移除这些助手
  filteredAgents.value = filteredAgents.value.filter(agent => 
    !selectedAgentKeys.value.includes(agent.id)
  )
  
  // 重新初始化可见助手列表
  initializeAgentList()
  
  // 清空选中状态
  selectedAgentKeys.value = []
  updateAgentSelectAllStatus()
}

// 从已分配移除助手
const handleRemoveAgentsFromAssigned = () => {
  if (selectedAssignedAgentKeys.value.length === 0) return
  
  // 获取选中的已分配助手对象
  const selectedAgents = assignedAgentsCache.value.filter(agent => 
    selectedAssignedAgentKeys.value.includes(agent.id)
  )
  
  // 从已分配列表移除
  assignedAgents.value = assignedAgents.value.filter(agentId => 
    !selectedAssignedAgentKeys.value.includes(agentId)
  )
  filteredAssignedAgents.value = filteredAssignedAgents.value.filter(agentId => 
    !selectedAssignedAgentKeys.value.includes(agentId)
  )
  
  // 从已分配缓存中移除
  assignedAgentsCache.value = assignedAgentsCache.value.filter(agent => 
    !selectedAssignedAgentKeys.value.includes(agent.id)
  )
  
  // 将这些助手添加回可分配列表
  filteredAgents.value = [...filteredAgents.value, ...selectedAgents]
  
  // 重新初始化可见助手列表
  initializeAgentList()
  
  // 清空选中状态
  selectedAssignedAgentKeys.value = []
  updateAssignedAgentSelectAllStatus()
}

// 根据ID获取用户信息
const getUserById = (userId) => {
  // 先从所有用户列表中查找（包括可分配的）
  let user = allUsers.value.find(user => user.user_id === userId)
  
  // 如果没找到，从已分配用户缓存中查找
  if (!user) {
    user = assignedUsersCache.value.find(user => user.user_id === userId)
  }
  
  if (!user) {
    console.warn('未找到用户信息:', userId)
    // 返回一个默认对象，避免显示错误
    return { 
      user_id: userId, 
      user_name: '未知用户', 
      department: '未知部门' 
    }
  }
  
  return user
}

// 根据ID获取助手信息
const getAgentById = (agentId) => {
  // 先从所有助手列表中查找（包括可分配的）
  let agent = allAgents.value.find(agent => agent.id === agentId)
  
  // 如果没找到，从已分配助手缓存中查找
  if (!agent) {
    agent = assignedAgentsCache.value.find(agent => agent.id === agentId)
  }
  
  if (!agent) {
    console.warn('未找到助手信息:', agentId)
    // 返回一个默认对象，避免显示错误
    return { 
      id: agentId, 
      name: '未知助手',
      mode: '未知模式'
    }
  }
  
  return agent
}

const handleSearch = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  searchTimer = setTimeout(() => {
    currentPage.value = 1
    loadData()
  }, 500)
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  loadData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  loadData()
}

// 助手分配人员
const handleAssignUsers = async (row) => {
  currentAgent.value = row
  
  try {
    // 先获取当前助手已分配的用户
    const response = await getAgentUserMap(row.id)
    const assignedUsersList = response.data.users || []
    
    // 然后加载所有用户
    const allUsersList = await loadAllUsers()
    
    // 过滤已分配用户列表，只保留在全部用户列表中存在的用户
    const validAssignedUsers = assignedUsersList.filter(user => 
      allUsersList.some(u => u.user_id === user.user_id)
    )
    
    // 保存有效的已分配用户ID列表
    const validUserIds = validAssignedUsers.map(user => user.user_id)
    assignedUsers.value = validUserIds
    filteredAssignedUsers.value = validUserIds // 初始化筛选后的列表
    
    // 保存已分配用户的完整信息到缓存
    assignedUsersCache.value = validAssignedUsers
    
    // 过滤可分配用户列表，只显示不在已分配列表中的用户
    filteredUsers.value = allUsersList.filter(user => 
      !validUserIds.includes(user.user_id)
    )
    
    initializeUserList()
    
    selectedUserKeys.value = []
    selectedAssignedKeys.value = []
    userSearchKeyword.value = ''
    assignedUserSearchKeyword.value = ''
    
    updateSelectAllStatus()
    updateAssignedSelectAllStatus()
    assignUserDialogVisible.value = true
  } catch (error) {
    console.error('获取助手用户信息失败:', error)
    ElMessage.error('获取助手用户信息失败')
  }
}

// 用户分配助手
const handleAssignAgents = async (row) => {
  currentUser.value = row
  
  try {
    // 先获取当前用户已分配的助手
    const response = await getUserAgentMap(row.user_id)
    const assignedAgentsList = response.data.agents || []
    
    // 然后加载所有助手
    const allAgentsList = await loadAllAgents()
    
    // 过滤已分配助手列表，只保留在全部助手列表中存在的助手
    const validAssignedAgents = assignedAgentsList.filter(agent => 
      allAgentsList.some(a => a.id === agent.id)
    )
    
    // 保存有效的已分配助手ID列表
    const validAgentIds = validAssignedAgents.map(agent => agent.id)
    assignedAgents.value = validAgentIds
    filteredAssignedAgents.value = validAgentIds // 初始化筛选后的列表
    
    // 保存已分配助手的完整信息到缓存
    assignedAgentsCache.value = validAssignedAgents
    
    // 过滤可分配助手列表，只显示不在已分配列表中的助手
    filteredAgents.value = allAgentsList.filter(agent => 
      !validAgentIds.includes(agent.id)
    )
    
    initializeAgentList()
    
    selectedAgentKeys.value = []
    selectedAssignedAgentKeys.value = []
    agentSearchKeyword.value = ''
    assignedAgentSearchKeyword.value = ''
    
    updateAgentSelectAllStatus()
    updateAssignedAgentSelectAllStatus()
    assignAgentDialogVisible.value = true
  } catch (error) {
    console.error('获取用户助手信息失败:', error)
    ElMessage.error('获取用户助手信息失败')
  }
}

// 确认分配用户给助手
const handleConfirmAssignUsers = async () => {
  if (!currentAgent.value) return
  
  assignLoading.value = true
  try {
    await setUserMap({
      agent_id: currentAgent.value.id,
      user_ids: assignedUsers.value
    })
    
    ElMessage.success('人员分配成功')
    assignUserDialogVisible.value = false
    
    // 重新加载列表
    await loadData()
  } catch (error) {
    console.error('分配失败:', error)
    ElMessage.error('分配失败')
  } finally {
    assignLoading.value = false
  }
}

// 确认分配助手给用户
const handleConfirmAssignAgents = async () => {
  if (!currentUser.value) return
  
  assignAgentLoading.value = true
  try {
    await setAgentMap({
      user_id: currentUser.value.user_id,
      agent_ids: assignedAgents.value
    })
    
    ElMessage.success('助手分配成功')
    assignAgentDialogVisible.value = false
    
    // 重新加载列表
    await loadData()
  } catch (error) {
    console.error('分配失败:', error)
    ElMessage.error('分配失败')
  } finally {
    assignAgentLoading.value = false
  }
}

const handleCloseAssignDialog = () => {
  assignUserDialogVisible.value = false
  currentAgent.value = null
  assignedUsers.value = []
  filteredAssignedUsers.value = []
  assignedUsersCache.value = []
  allUsers.value = []
  filteredUsers.value = []
  visibleUsers.value = []
  selectedUserKeys.value = []
  selectedAssignedKeys.value = []
  userSearchKeyword.value = ''
  assignedUserSearchKeyword.value = ''
  allUsersSelected.value = false
  isIndeterminate.value = false
  currentUserPage.value = 1
}

const handleCloseAssignAgentDialog = () => {
  assignAgentDialogVisible.value = false
  currentUser.value = null
  assignedAgents.value = []
  filteredAssignedAgents.value = []
  assignedAgentsCache.value = []
  allAgents.value = []
  filteredAgents.value = []
  visibleAgents.value = []
  selectedAgentKeys.value = []
  selectedAssignedAgentKeys.value = []
  agentSearchKeyword.value = ''
  assignedAgentSearchKeyword.value = ''
  allAgentsSelected.value = false
  isAgentIndeterminate.value = false
  currentAgentPage.value = 1
}

// 清除搜索防抖定时器
onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  if (userSearchTimer) {
    clearTimeout(userSearchTimer)
  }
  if (agentSearchTimer) {
    clearTimeout(agentSearchTimer)
  }
})

// 已分配用户搜索
const handleAssignedUserSearch = () => {
  const keyword = assignedUserSearchKeyword.value.toLowerCase()
  
  if (keyword) {
    // 根据关键词筛选已分配用户
    filteredAssignedUsers.value = assignedUsers.value.filter(userId => {
      const user = getUserById(userId)
      return user && (
        (user.user_name && user.user_name.toLowerCase().includes(keyword)) ||
        (user.email && user.email.toLowerCase().includes(keyword))
      )
    })
  } else {
    // 清空筛选条件时，显示所有已分配用户
    filteredAssignedUsers.value = [...assignedUsers.value]
  }
  
  // 更新全选状态
  updateAssignedSelectAllStatus()
}

// 已分配助手搜索
const handleAssignedAgentSearch = () => {
  const keyword = assignedAgentSearchKeyword.value.toLowerCase()
  
  if (keyword) {
    // 根据关键词筛选已分配助手
    filteredAssignedAgents.value = assignedAgents.value.filter(agentId => {
      const agent = getAgentById(agentId)
      return agent && (
        (agent.name && agent.name.toLowerCase().includes(keyword)) ||
        (agent.desc && agent.desc.toLowerCase().includes(keyword)) ||
        (agent.mode && agent.mode.toLowerCase().includes(keyword))
      )
    })
  } else {
    // 清空筛选条件时，显示所有已分配助手
    filteredAssignedAgents.value = [...assignedAgents.value]
  }
  
  // 更新全选状态
  updateAssignedAgentSelectAllStatus()
}

// 已分配用户全选状态更新
const updateAssignedSelectAllStatus = () => {
  if (filteredAssignedUsers.value.length === 0) {
    allAssignedUsersSelected.value = false
    isAssignedIndeterminate.value = false
    return
  }
  
  const selectedCount = selectedAssignedKeys.value.filter(key => 
    filteredAssignedUsers.value.includes(key)
  ).length
  
  if (selectedCount === 0) {
    allAssignedUsersSelected.value = false
    isAssignedIndeterminate.value = false
  } else if (selectedCount === filteredAssignedUsers.value.length) {
    allAssignedUsersSelected.value = true
    isAssignedIndeterminate.value = false
  } else {
    allAssignedUsersSelected.value = false
    isAssignedIndeterminate.value = true
  }
}

// 已分配助手全选状态更新
const updateAssignedAgentSelectAllStatus = () => {
  if (filteredAssignedAgents.value.length === 0) {
    allAssignedAgentsSelected.value = false
    isAssignedAgentIndeterminate.value = false
    return
  }
  
  const selectedCount = selectedAssignedAgentKeys.value.filter(key => 
    filteredAssignedAgents.value.includes(key)
  ).length
  
  if (selectedCount === 0) {
    allAssignedAgentsSelected.value = false
    isAssignedAgentIndeterminate.value = false
  } else if (selectedCount === filteredAssignedAgents.value.length) {
    allAssignedAgentsSelected.value = true
    isAssignedAgentIndeterminate.value = false
  } else {
    allAssignedAgentsSelected.value = false
    isAssignedAgentIndeterminate.value = true
  }
}

// 处理已分配用户全选
const handleAssignedSelectAll = (checked) => {
  if (checked) {
    // 全选当前筛选后的已分配用户
    selectedAssignedKeys.value = [...new Set([...selectedAssignedKeys.value, ...filteredAssignedUsers.value])]
  } else {
    // 取消选中当前筛选后的已分配用户
    selectedAssignedKeys.value = selectedAssignedKeys.value.filter(key => 
      !filteredAssignedUsers.value.includes(key)
    )
  }
  updateAssignedSelectAllStatus()
}

// 处理已分配助手全选
const handleAssignedAgentSelectAll = (checked) => {
  if (checked) {
    // 全选当前筛选后的已分配助手
    selectedAssignedAgentKeys.value = [...new Set([...selectedAssignedAgentKeys.value, ...filteredAssignedAgents.value])]
  } else {
    // 取消选中当前筛选后的已分配助手
    selectedAssignedAgentKeys.value = selectedAssignedAgentKeys.value.filter(key => 
      !filteredAssignedAgents.value.includes(key)
    )
  }
  updateAssignedAgentSelectAllStatus()
}
</script>

<style lang="stylus" scoped>
.user-agent
  padding 20px

.tab-section
  margin-bottom 20px
  
  :deep(.el-tabs__header)
    margin-bottom 0
    
  :deep(.el-tabs__nav-wrap::after)
    height 1px

.search-section
  margin-bottom 20px
  padding 20px
  background #f5f7fa
  border-radius 8px

.action-buttons
  display flex
  gap 8px
  flex-wrap wrap
  
  .el-button
    margin 0

.pagination-section
  display flex
  justify-content center
  padding 20px 0

.agent-tags
  display flex
  flex-wrap wrap
  gap 4px
  
  .no-agents
    color #c0c4cc
    font-style italic

.assign-dialog-content
  .agent-info, .user-info
    margin-bottom 24px
    padding 20px
    background linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)
    border-radius 12px
    border-left 4px solid #667eea
    box-shadow 0 2px 8px rgba(0, 0, 0, 0.06)
    
    h4
      margin 0 0 8px 0
      color #2c3e50
      font-size 18px
      font-weight 600
      display flex
      align-items center
      
      &::before
        content ''
        width 6px
        height 6px
        background #667eea
        border-radius 50%
        margin-right 8px
        
    p, span
      margin 0
      color #6c757d
      line-height 1.6
      font-size 14px

.transfer-container
  display flex
  align-items flex-start
  gap 24px
  
.transfer-panel
  flex 1
  border 1px solid #e1e5e9
  border-radius 12px
  background white
  box-shadow 0 4px 12px rgba(0, 0, 0, 0.08)
  transition all 0.3s ease
  height 500px
  display flex
  flex-direction column
  
  &:hover
    box-shadow 0 8px 20px rgba(0, 0, 0, 0.12)
  
  .panel-header
    display flex
    justify-content space-between
    align-items center
    padding 16px 20px
    background linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)
    border-bottom 1px solid #e8ecf0
    border-radius 12px 12px 0 0
    flex-shrink 0
    
    .panel-title
      font-weight 600
      color #2c3e50
      font-size 15px
      display flex
      align-items center
      
      &::before
        content ''
        width 8px
        height 8px
        background #667eea
        border-radius 50%
        margin-right 8px
        
    .el-input
      .el-input__wrapper
        border-radius 8px
        border 1px solid #e1e5e9
        background white
        box-shadow 0 2px 4px rgba(0, 0, 0, 0.06)
        
        &:hover
          border-color #667eea
          box-shadow 0 2px 8px rgba(102, 126, 234, 0.2)
          
        &.is-focus
          border-color #667eea
          box-shadow 0 2px 8px rgba(102, 126, 234, 0.3)
      
  .panel-content
    padding 20px
    flex 1
    overflow hidden
    display flex
    flex-direction column
    
    .search-container
      margin-bottom 16px
      
      .el-input
        .el-input__wrapper
          border-radius 8px
          border 1px solid #e1e5e9
          background white
          box-shadow 0 2px 4px rgba(0, 0, 0, 0.06)
          
          &:hover
            border-color #667eea
            box-shadow 0 2px 8px rgba(102, 126, 234, 0.2)
            
          &.is-focus
            border-color #667eea
            box-shadow 0 2px 8px rgba(102, 126, 234, 0.3)
    
    .select-all-checkbox
      margin-bottom 16px
      border-bottom 1px solid #f0f2f5
      padding-bottom 16px
      flex-shrink 0
      
      :deep(.el-checkbox__label)
        font-weight 500
        color #495057
        
      :deep(.el-checkbox__input.is-checked .el-checkbox__inner)
        background-color #667eea
        border-color #667eea

.transfer-buttons
  display flex
  flex-direction column
  gap 12px
  padding 0
  align-items center
  justify-content center
  height 500px
  width 80px
  
  .el-button
    width 50px
    height 50px
    border-radius 50%
    font-weight 500
    transition all 0.3s ease
    display flex
    align-items center
    justify-content center
    padding 0
    margin 0 !important
    margin-left 0 !important
    
    .el-icon
      font-size 18px
    
    &.el-button--primary
      background linear-gradient(135deg, #667eea 0%, #764ba2 100%)
      border none
      box-shadow 0 4px 12px rgba(102, 126, 234, 0.4)
      
      &:hover
        transform scale(1.1)
        box-shadow 0 6px 16px rgba(102, 126, 234, 0.5)
        
      &:disabled
        background #c0c4cc
        transform none
        box-shadow none
        
    &:not(.el-button--primary)
      background white
      border 1px solid #e1e5e9
      color #6c757d
      
      &:hover
        background linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)
        border-color #667eea
        color #667eea
        transform scale(1.05)
        
      &:disabled
        background #f8f9fa
        color #c0c4cc
        transform none

/* 复选框组重置 */
:deep(.el-checkbox) {
  width: 100%;
  margin-bottom: 0 !important;
  line-height: 1.8 !important;
  min-height: 36px;
  display: flex;
  align-items: center;
}

:deep(.el-checkbox__label) {
  width: 100%;
  line-height: 1.8 !important;
  padding-left: 8px;
  display: flex;
  align-items: center;
}

.user-list .virtual-list .user-item {
  margin-bottom: 4px;
  padding: 4px 8px;
  min-height: 40px;
  display: flex;
  align-items: center;
  
  &:hover {
    background: #f8f9ff;
  }
}

/* 滚动条美化 */
:deep(.el-scrollbar__bar)
  .el-scrollbar__thumb
    background-color rgba(102, 126, 234, 0.3)
    border-radius 4px
    
    &:hover
      background-color rgba(102, 126, 234, 0.5)

/* 分配对话框样式美化 */
:deep(.el-dialog) {
  border-radius 12px
  box-shadow 0 20px 50px rgba(0, 0, 0, 0.15)
  
  .el-dialog__header {
    background white
    color #2c3e50
    padding 20px 24px
    border-radius 12px 12px 0 0
    border-bottom 1px solid #e8ecf0
    
    .el-dialog__title {
      font-size 18px
      font-weight 600
      color #2c3e50
    }
    
    .el-dialog__close {
      color #6c757d
      font-size 18px
      
      &:hover {
        color #2c3e50
      }
    }
  }
  
  .el-dialog__body {
    padding 24px
    background #fafbfc
  }
  
  .el-dialog__footer {
    padding 16px 24px 24px
    background #fafbfc
    border-radius 0 0 12px 12px
    
    .el-button {
      padding 10px 24px
      border-radius 8px
      font-weight 500
      
      &.el-button--primary {
        background linear-gradient(135deg, #667eea 0%, #764ba2 100%)
        border none
        box-shadow 0 4px 12px rgba(102, 126, 234, 0.4)
        
        &:hover {
          transform translateY(-1px)
          box-shadow 0 6px 16px rgba(102, 126, 234, 0.5)
        }
      }
      
      &:not(.el-button--primary) {
        background white
        border 1px solid #e1e5e9
        color #6c757d
        
        &:hover {
          background #f8f9fa
          border-color #d0d7de
        }
      }
    }
  }
}

/* 响应式设计 */
@media (max-width: 900px)
  .action-buttons
    flex-direction column
    
    .el-button
      width 100%
      margin-bottom 4px
      
  .transfer-container
    flex-direction column
    gap 16px
    
    .transfer-panel
      width 100%
      
    .transfer-buttons
      flex-direction row
      padding 12px 0
      
      .el-button
        flex 1
        max-width 120px

.load-more
  text-align center
  padding 12px 0
  border-top 1px solid #f0f2f5
  margin-top 8px
  flex-shrink 0
  
  .el-button
    border-radius 6px
    background linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)
    border 1px solid #e1e5e9
    color #667eea
    font-weight 500
    padding 6px 12px
    font-size 12px
    
    &:hover
      background linear-gradient(135deg, #667eea 0%, #764ba2 100%)
      color white
      border-color transparent

:deep(.el-checkbox-group) {
  width: 100%;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #667eea !important;
  border-color: #667eea !important;
}

:deep(.el-checkbox__inner) {
  border-radius: 4px;
  transition: all 0.2s ease;
}

:deep(.el-checkbox__input.is-indeterminate .el-checkbox__inner) {
  background-color: #667eea !important;
  border-color: #667eea !important;
}
</style>