
module.exports = {
  doLogin(db, username, password) {
    return db('users')
      .select('username', 'email', 'id')
      .where('username', username)
      .where('password', password)
      .limit(1);
  },

  getList(db) {
    return db('users').orderBy('id');
  },

  save(db, data) {
    return db('users').insert(data, 'id');
  },

  update(db, id, data) {
    return db('users')
      .where('id', id)
      .update(data);
  },

  remove(db, id) {
    return db('users')
      .where('id', id)
      .del();
  },

  getInfo(db, id) {
    return db('users')
      .where('id', id);
  },

  getLabOrders(db, hn) {
    return db('lab_head_app')
      .select('lab_order_number', 'reporter_name', 'order_date',
        'report_date', 'order_time', 'report_time', 'form_name',
        'department', 'confirm_report')
      .where('hn', hn)
      .orderBy('order_date', 'desc');
  },

  loginPatient(db, cid, birthday) {
    var sql = `
    select p.cid, p.birthday, p.fname, p.lname, p.hn
    from patient_app as p 
    where p.cid=? and p.birthday=?
    `;
    return db.raw(sql, [cid, birthday]);
  },

  getLabResult(db, hn, orderId) {
    var sql = `
    select o.lab_order_result, o.confirm, i.lab_items_name, 
    o.lab_items_normal_value_ref, i.lab_items_unit

    from lab_order_mobile_app as o 
    inner join lab_items as i on i.lab_items_code=o.lab_items_code
    inner join lab_head_app as h on h.lab_order_number=o.lab_order_number and h.hn=?
    where o.lab_order_number=?
    `;
    return db.raw(sql, [hn, orderId]);
  }
};