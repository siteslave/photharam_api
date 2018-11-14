
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
  }
};