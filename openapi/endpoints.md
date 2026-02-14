# Endpoints Inventory

| Tag | Method | Path | Auth | Request(params/DTO) | Response | Notes |
|---|---|---|---|---|---|---|
| Crop Batch | POST | /crop/batch | No | body: CropBatch | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| Crop Batch | PUT | /crop/batch | No | body: CropBatch | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| Crop Batch | GET | /crop/batch/list | No | params: query.pageNum, query.pageSize, query.plotId, query.currentStage | R<PageCropBatch> (current/size/total/records; code=200/500) | 当前代码未启用鉴权（高风险）; 推荐迁移到 pageNo/pageSize/total/list（可选） |
| Crop Batch | DELETE | /crop/batch/{ids} | No | params: path.ids | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| Crop Growth Log | POST | /crop/growth-log | No | body: GrowthStageLog | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| Crop Growth Log | GET | /crop/growth-log/list/{batchId} | No | params: path.batchId | R<Array<GrowthStageLog>> (code=200/500) | 当前代码未启用鉴权（高风险） |
| Crop Variety | POST | /crop/variety | No | body: BaseCropVariety | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| Crop Variety | PUT | /crop/variety | No | body: BaseCropVariety | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| Crop Variety | GET | /crop/variety/all | No | none | R<Array<BaseCropVariety>> (code=200/500) | 当前代码未启用鉴权（高风险） |
| Crop Variety | GET | /crop/variety/list | No | params: query.pageNum, query.pageSize, query.cropName | R<PageBaseCropVariety> (current/size/total/records; code=200/500) | 当前代码未启用鉴权（高风险）; 推荐迁移到 pageNo/pageSize/total/list（可选） |
| Crop Variety | DELETE | /crop/variety/{ids} | No | params: path.ids | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| IoT Data | GET | /iot/data/list | No | params: query.pageNum, query.pageSize, query.plotId, query.sensorType | R<PageIotSensorData> (current/size/total/records; code=200/500) | 当前代码未启用鉴权（高风险）; 推荐迁移到 pageNo/pageSize/total/list（可选） |
| IoT Rule | POST | /iot/rule | No | body: AgriTaskRule | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| IoT Rule | PUT | /iot/rule | No | body: AgriTaskRule | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| IoT Rule | GET | /iot/rule/list | No | params: query.pageNum, query.pageSize | R<PageAgriTaskRule> (current/size/total/records; code=200/500) | 当前代码未启用鉴权（高风险）; 推荐迁移到 pageNo/pageSize/total/list（可选） |
| IoT Rule | DELETE | /iot/rule/{id} | No | params: path.id | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| Auth | POST | /login | No | body: LoginBody | R<LoginData> (code=200/500) | 当前代码未启用鉴权（高风险）; Sensitive field exposure risk |
| Material Info | POST | /material/info | No | body: MaterialInfo | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| Material Info | PUT | /material/info | No | body: MaterialInfo | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| Material Info | GET | /material/info/list | No | params: query.pageNum, query.pageSize, query.name, query.category | R<PageMaterialInfo> (current/size/total/records; code=200/500) | 当前代码未启用鉴权（高风险）; 推荐迁移到 pageNo/pageSize/total/list（可选） |
| Material Info | DELETE | /material/info/{ids} | No | params: path.ids | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| Material Log | POST | /material/log/execute | No | body: MaterialInoutLog | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险）; Inventory deduction has concurrency risk |
| Material Log | GET | /material/log/list | No | params: query.pageNum, query.pageSize, query.materialId | R<PageMaterialInoutLog> (current/size/total/records; code=200/500) | 当前代码未启用鉴权（高风险）; 推荐迁移到 pageNo/pageSize/total/list（可选） |
| Auth | POST | /register | No | body: SysUser | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| Report | GET | /report/dashboard | No | none | R<DashboardData> (code=200/500) | 当前代码未启用鉴权（高风险） |
| System Menu | POST | /system/menu | No | body: SysMenu | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| System Menu | PUT | /system/menu | No | body: SysMenu | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| System Menu | GET | /system/menu/list | No | none | R<Array<SysMenu>> (code=200/500) | 当前代码未启用鉴权（高风险） |
| System Menu | DELETE | /system/menu/{menuId} | No | params: path.menuId | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| System Role | POST | /system/role | No | body: SysRole | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| System Role | PUT | /system/role | No | body: SysRole | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| System Role | GET | /system/role/list | No | params: query.pageNum, query.pageSize, query.roleName | R<PageSysRole> (current/size/total/records; code=200/500) | 当前代码未启用鉴权（高风险）; 推荐迁移到 pageNo/pageSize/total/list（可选） |
| System Role | DELETE | /system/role/{roleIds} | No | params: path.roleIds | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| System User | POST | /system/user | No | body: SysUser | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| System User | PUT | /system/user | No | body: SysUser | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| System User | GET | /system/user/list | No | params: query.pageNum, query.pageSize, query.username, query.realName, query.status | R<PageSysUser> (current/size/total/records; code=200/500) | 当前代码未启用鉴权（高风险）; 推荐迁移到 pageNo/pageSize/total/list（可选）; Sensitive field exposure risk |
| System User | DELETE | /system/user/{userIds} | No | params: path.userIds | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| System User | GET | /system/user/{userId} | No | params: path.userId | R<SysUser> (code=200/500) | 当前代码未启用鉴权（高风险）; Sensitive field exposure risk |
| Task | POST | /task | No | body: AgriTask | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| Task | PUT | /task | No | body: AgriTask | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| Task | PUT | /task/assign | No | body: TaskAssignRequest | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险）; taskId and executorId are required |
| Task | GET | /task/list | No | params: query.pageNum, query.pageSize, query.taskName, query.status, query.executorId | R<PageAgriTask> (current/size/total/records; code=200/500) | 当前代码未启用鉴权（高风险）; 推荐迁移到 pageNo/pageSize/total/list（可选） |
| Task Log | POST | /task/log | No | body: TaskExecutionLog | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |
| Task Log | GET | /task/log/list | No | params: query.pageNum, query.pageSize, query.taskId | R<PageTaskExecutionLog> (current/size/total/records; code=200/500) | 当前代码未启用鉴权（高风险）; 推荐迁移到 pageNo/pageSize/total/list（可选） |
| Task | DELETE | /task/{ids} | No | params: path.ids | R<Void> (code=200 success / code=500 error) | 当前代码未启用鉴权（高风险） |

## Information Needed
1. JWT token expiration/refresh strategy is not defined in current code.
2. {'Enum semantics need confirmation': 'agri_task.status, material_inout_log.type, sys_menu.type, agri_task_rule.isEnable.'}
3. Comma-separated path-array style (/{ids}) should be validated with API gateway/router.
4. Timezone/date serialization contract is not explicitly configured in Jackson.
5. Long/BigDecimal serialization strategy for Vue3+TS precision is not explicitly configured.